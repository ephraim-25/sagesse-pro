import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { Grade } from '@prisma/client';

const GRADE_LEVELS: Record<Grade, number> = {
    PRESIDENT: 3,
    DIRECTOR: 2,
    BUREAU_CHIEF: 1,
    AGENT: 0,
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, creatorId, assigneeId } = req.body;

        if (!title || !creatorId || !assigneeId) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const creator = await prisma.user.findUnique({ where: { id: creatorId } });
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });

        if (!creator || !assignee) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // 1. Hierarchy Validation
        const creatorLevel = GRADE_LEVELS[creator.grade];
        const assigneeLevel = GRADE_LEVELS[assignee.grade];

        if (creatorLevel <= assigneeLevel) {
            res.status(403).json({ error: 'Insufficient grade to assign task to this user' });
            return;
        }

        // 2. Unit Validation (Must be same unit, unless President who can assign to anyone - assuming logic)
        // "Seul un grade supérieur peut assigner à un grade inférieur rattaché à son unité"
        if (creator.grade !== 'PRESIDENT' && creator.unitType !== assignee.unitType) {
            res.status(403).json({ error: 'Users must belong to the same unit' });
            return;
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                creatorId,
                assigneeId,
                status: 'PENDING'
            }
        });

        res.status(201).json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTasks = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const tasks = await prisma.task.findMany({
            where: {
                OR: [
                    { assigneeId: userId },
                    { creatorId: userId }
                ]
            },
            include: {
                assignee: true,
                creator: true
            }
        });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
