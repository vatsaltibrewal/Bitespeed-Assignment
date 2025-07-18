import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


export const identifyContactService = async (email, phoneNumber) => {
  // Step 1: Find all contacts that directly match the incoming email or phone number.
  const { data: initialContacts, error: initialError } = await supabase
    .from('Contact')
    .select('*')
    .or(`email.eq.${email},phoneNumber.eq.${phoneNumber}`);

  if (initialError) {
    throw new Error(`Supabase initial fetch error: ${initialError.message}`);
  }

  // Case 1: No existing contacts found. Create a new primary contact.
  if (!initialContacts || initialContacts.length === 0) {
    const { data: newContactData, error: createError } = await supabase
      .from('Contact')
      .insert({ email, phoneNumber, linkPrecedence: 'primary' })
      .select()
      .single();

    if (createError) throw new Error(`Supabase create error: ${createError.message}`);

    return {
      primaryContactId: newContactData.id,
      emails: [newContactData.email].filter(Boolean),
      phoneNumbers: [newContactData.phoneNumber].filter(Boolean),
      secondaryContactIds: [],
    };
  }

  // Step 2: We have matches. Now find the entire "family" of linked contacts.
  let primaryContact = initialContacts.reduce((oldest, contact) => {
    return new Date(contact.createdAt) < new Date(oldest.createdAt) ? contact : oldest;
  });

  if (primaryContact.linkPrecedence === 'secondary') {
    const { data: rootPrimary, error: rootError } = await supabase
      .from('Contact')
      .select('*')
      .eq('id', primaryContact.linkedId)
      .single();
    if (rootError) throw new Error(`Supabase root fetch error: ${rootError.message}`);
    primaryContact = rootPrimary;
  }
  
  // Step 3: Fetch the primary contact AND all contacts linked to it.
  const { data: fullContactList, error: fullListError } = await supabase
      .from('Contact')
      .select('*')
      .or(`id.eq.${primaryContact.id},linkedId.eq.${primaryContact.id}`)
      .order('createdAt', { ascending: true });
      
  if (fullListError) throw new Error(`Supabase full list fetch error: ${fullListError.message}`);

  const finalPrimaryContact = fullContactList[0];
  let secondaryContacts = fullContactList.slice(1);

  // Step 4: Check if any unlinked primary contacts from our initial search need to be merged.
  const primaryContactsToMerge = initialContacts.filter(
    (c) => c.linkPrecedence === 'primary' && c.id !== finalPrimaryContact.id
  );

  if (primaryContactsToMerge.length > 0) {
    const idsToUpdate = primaryContactsToMerge.map(c => c.id);
    const { data: updatedContacts, error: updateError } = await supabase
      .from('Contact')
      .update({ linkPrecedence: 'secondary', linkedId: finalPrimaryContact.id })
      .in('id', idsToUpdate)
      .select();

    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);
    secondaryContacts = [...secondaryContacts, ...updatedContacts];
  }

  // Step 5: Check if the incoming request contains brand new information.
  const existingEmails = new Set(fullContactList.map(c => c.email));
  const existingPhoneNumbers = new Set(fullContactList.map(c => c.phoneNumber));
  
  const hasNewInfo = (email && !existingEmails.has(email)) || (phoneNumber && !existingPhoneNumbers.has(phoneNumber));
  
  if (hasNewInfo) {
    const { data: newSecondaryContact, error: createError } = await supabase
      .from('Contact')
      .insert({
        email,
        phoneNumber,
        linkedId: finalPrimaryContact.id,
        linkPrecedence: 'secondary',
      })
      .select()
      .single();

    if (createError) throw new Error(createError.message);
    secondaryContacts.push(newSecondaryContact);
  }

  // Step 6: Consolidate all data for the final response.
  const allEmails = [finalPrimaryContact.email, ...secondaryContacts.map(c => c.email)].filter(Boolean);
  const allPhoneNumbers = [finalPrimaryContact.phoneNumber, ...secondaryContacts.map(c => c.phoneNumber)].filter(Boolean);
  
  const response = {
    primaryContactId: finalPrimaryContact.id,
    emails: [...new Set(allEmails)],
    phoneNumbers: [...new Set(allPhoneNumbers)],
    secondaryContactIds: [...new Set(secondaryContacts.map(c => c.id))],
  };

  return response;
};