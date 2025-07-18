import { identifyContactService } from '../services/contact.service.js';

export const identifyContactController = async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email || !phoneNumber) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Both email and phoneNumber must be provided.',
    });
  }

  try {
    const result = await identifyContactService(email, phoneNumber);
    res.status(200).json({ contact: result });
  } catch (error) {
    console.error('Error in identifyContactController:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};