import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { WorkType } from '@prisma/client';

export const checkIn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, type } = req.body;

        if (!userId || !type) {
            res.status(400).json({ error: 'Missing userId or type' });
            return;
        }

        // Check if user has an active check-in
        const activeAttendance = await prisma.attendance.findFirst({
            where: {
                userId,
                checkOut: null
            }
        });

        if (activeAttendance) {
            res.status(400).json({ error: 'User already checked in' });
            return;
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                type: type as WorkType,
                checkIn: new Date()
            }
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const checkOut = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.body;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        // Find active check-in
        const activeAttendance = await prisma.attendance.findFirst({
            where: {
                userId,
                checkOut: null
            }
        });

        if (!activeAttendance) {
            res.status(404).json({ error: 'No active check-in found' });
            return;
        }

        const attendance = await prisma.attendance.update({
            where: { id: activeAttendance.id },
            data: {
                checkOut: new Date()
            }
        });

        res.status(200).json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
