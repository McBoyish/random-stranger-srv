import express from 'express';
import { Collection, ObjectId } from 'mongodb';
import { db } from '../utils/database';
import { User, InputAccount, Account, UserData } from '../types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AUTH_KEY } from '../utils/config';

export const accountRouter = express.Router();

accountRouter.post('/register', async (req, res, next) => {
	try {
		const { name, password } = req.body as InputAccount;

		const accountCollection = db.collection<Account>('accounts');
		const userCollection = db.collection<User>('users');
		const user = await userCollection.findOne({ name });

		if (user) {
			res.json(null);
			return;
		}

		const encrypted = await bcrypt.hash(password, 10);

		const account: Account = {
			_id: new ObjectId().toString(),
			user: { _id: new ObjectId().toString(), name },
			password: encrypted,
			createdAt: new Date().toISOString(),
		};

		await accountCollection.insertOne(account);
		await userCollection.insertOne(account.user);

		const token = jwt.sign(account.user, AUTH_KEY, { expiresIn: '28d' });

		const userData: UserData = { ...account.user, token };
		res.json(userData);
	} catch (e) {
		next(new Error('unknown-error'));
	}
});

accountRouter.post('/login', async (req, res, next) => {
	try {
		const { name, password } = req.body as InputAccount;

		const accountCollection = db.collection<Account>('accounts');
		const account = await accountCollection.findOne({ 'user.name': name });

		if (account && (await bcrypt.compare(password, account.password))) {
			const token = jwt.sign(account.user, AUTH_KEY, {
				expiresIn: '28d',
			});
			const userData: UserData = { ...account.user, token };
			res.json(userData);
			return;
		}

		res.json(null);
	} catch (e) {
		next(new Error('unknown-error'));
	}
});
