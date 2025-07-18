import { Router } from 'express';
import { identifyContactController } from '../controllers/contact.controller.js';

const router = Router();

router.post('/identify', identifyContactController);

export default router;