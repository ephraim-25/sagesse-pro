import { Router } from 'express';
import { checkIn, checkOut } from '../controllers/attendance.controller';

const router = Router();

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

export default router;
