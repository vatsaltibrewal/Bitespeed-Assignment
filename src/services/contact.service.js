import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


export const identifyContactService = async (email, phoneNumber) => {

    const { data: matchingContacts, error } = await supabase
        .from('Contact')
        .select('*')
        .or(`email.eq.${email},phoneNumber.eq.${phoneNumber}`)
        .order('createdAt', { ascending: true }); // Always get the oldest first

    if (error) throw new Error(error.message);

    // Case 1: No existing contacts found. Create a new primary contact.
    if (!matchingContacts || matchingContacts.length === 0) {
        const { data: newContactData, error: createError } = await supabase
        .from('Contact')
        .insert({ email, phoneNumber, linkPrecedence: 'primary' })
        .select()
        .single();

        if (createError) throw new Error(createError.message);

        return {
        primaryContactId: newContactData.id,
        emails: [newContactData.email].filter(Boolean),
        phoneNumbers: [newContactData.phoneNumber].filter(Boolean),
        secondaryContactIds: [],
        };
    }

    // Case 2: Existing contacts found. Time to consolidate.
    let primaryContact = matchingContacts[0];
    const secondaryContacts = matchingContacts.slice(1);
  
    // Check if a merge is needed between two primary contacts
    const primaryContactsInSet = matchingContacts.filter(c => c.linkPrecedence === 'primary');
    if (primaryContactsInSet.length > 1) {
        const contactToUpdate = primaryContactsInSet[1];
        const { data: updatedContact, error: updateError } = await supabase
            .from('Contact')
            .update({ linkPrecedence: 'secondary', linkedId: primaryContact.id })
            .eq('id', contactToUpdate.id)
            .select()
            .single();
        
        if(updateError) throw new Error(updateError.message);
        
        secondaryContacts.push(updatedContact);
    }

    // Check if the incoming request contains new information
    const hasNewEmail = email && !matchingContacts.some(c => c.email === email);
    const hasNewPhoneNumber = phoneNumber && !matchingContacts.some(c => c.phoneNumber === phoneNumber);

    if (hasNewEmail || hasNewPhoneNumber) {
        const { data: newSecondaryContact, error: createError } = await supabase
        .from('Contact')
        .insert({
            email,
            phoneNumber,
            linkedId: primaryContact.id,
            linkPrecedence: 'secondary',
        })
        .select()
        .single();

        if (createError) throw new Error(createError.message);
        secondaryContacts.push(newSecondaryContact);
    }

    // Consolidate all data for the final response
    const allEmails = [primaryContact.email, ...secondaryContacts.map(c => c.email)].filter(Boolean);
    const allPhoneNumbers = [primaryContact.phoneNumber, ...secondaryContacts.map(c => c.phoneNumber)].filter(Boolean);
    
    const response = {
        primaryContactId: primaryContact.id,
        emails: [...new Set(allEmails)],
        phoneNumbers: [...new Set(allPhoneNumbers)],
        secondaryContactIds: secondaryContacts.map(c => c.id),
    };

    return response;
};