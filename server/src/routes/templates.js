import { Router } from 'express';
import { requireAuth, HttpError } from '../lib/auth.js';
import { TEMPLATES, getTemplate } from '../data/templates.js';
import { createDream } from './dreams.js';

const r = Router();

r.get('/dreams', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  const cat = (req.query.category || '').toString();
  const list = TEMPLATES.filter((t) => (!cat || t.archetype === cat) && (!q || `${t.title} ${t.dream} ${t.category}`.toLowerCase().includes(q)));
  res.json({ templates: list, total: list.length });
});

r.get('/:templateId', (req, res) => {
  const t = getTemplate(req.params.templateId);
  if (!t) throw new HttpError(404, 'Template not found.');
  res.json({ template: t });
});

r.post('/use-template', requireAuth, async (req, res) => {
  const t = getTemplate(req.body?.templateId);
  if (!t) throw new HttpError(404, 'Template not found.');
  const dream = await createDream(req.user.id, { templateId: t.id, description: req.body?.customization || t.dream });
  res.status(201).json({ dream });
});

export default r;
