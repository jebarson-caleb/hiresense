import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import HttpError from '../utils/httpError.js';

export async function register(req, res) {
  const { name, email, password, role = 'seeker', company = '' } = req.body;
  if (!['seeker', 'recruiter'].includes(role)) throw new HttpError(400, 'Role must be seeker or recruiter');
  if (role === 'recruiter' && !company.trim()) throw new HttpError(400, 'Company name is required for recruiters');
  if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'An account with this email already exists');

  const user = await User.create({ name, email, password, role, company });
  res.status(201).json({ token: signToken(user), user });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new HttpError(401, 'Invalid email or password');
  if (!user.isActive) throw new HttpError(403, 'Account has been deactivated by an administrator');
  res.json({ token: signToken(user), user });
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  const { name, headline, company } = req.body;
  if (name !== undefined) req.user.name = name;
  if (headline !== undefined) req.user.headline = headline;
  if (company !== undefined && req.user.role === 'recruiter') req.user.company = company;
  await req.user.save();
  res.json({ user: req.user });
}
