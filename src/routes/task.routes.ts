import { Router } from 'express';
import { createTask, getTasks } from '../controllers/task.controller';

const router = Router();

router.post('/', createTask);
router.get('/user/:userId', getTasks);

export default router;
