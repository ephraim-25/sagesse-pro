import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import attendanceRoutes from './routes/attendance.routes';
// Task routes import will go here

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/attendance', attendanceRoutes);

import taskRoutes from './routes/task.routes';
app.use('/api/tasks', taskRoutes);


// Health check
app.get('/health', (req, res) => {
    res.send('Sagesse-Pro Backend Running');
});

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

export default app;
