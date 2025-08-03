import express from 'express';
import { controlServo } from '../controllers/switchController.js';

const router = express.Router();

router.post('/:id/:state', controlServo);

export default router;
