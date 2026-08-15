import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAthleteProfileText, saveAthleteProfileText } from '$lib/server/athlete-profile';

// GET /api/athlete-profile — retrieve current athlete profile
export const GET: RequestHandler = async () => {
  try {
    const profile = await getAthleteProfileText();
    return json(profile);
  } catch (err: any) {
    return json({ error: err.message || 'Erreur lors de la récupération du profil' }, { status: 500 });
  }
};

// PUT /api/athlete-profile — update full athlete profile text
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return json({ error: 'Texte du profil requis' }, { status: 400 });
    }

    const result = await saveAthleteProfileText(text);
    return json(result);
  } catch (err: any) {
    return json({ error: err.message || 'Erreur lors de la sauvegarde du profil' }, { status: 500 });
  }
};

// POST /api/athlete-profile — partial update or section modification
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const current = await getAthleteProfileText();
    let updatedText = current.text;

    if (body.text) {
      updatedText = body.text;
    } else if (body.section && body.content) {
      // Append or replace section
      updatedText += `\n\n### Mise à jour (${new Date().toLocaleDateString('fr-FR')}) — ${body.section}\n${body.content}`;
    }

    const result = await saveAthleteProfileText(updatedText);
    return json(result);
  } catch (err: any) {
    return json({ error: err.message || 'Erreur lors de la mise à jour' }, { status: 500 });
  }
};
