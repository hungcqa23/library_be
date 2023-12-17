import axios from 'axios';
import { GoogleUserResult } from '../models/interfaces/OAuth.interfaces';

export const getOAuthGoogleToken = async (code: string) => {
  const body = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code'
  };

  const { data } = await axios.post('https://oauth2.googleapis.com/token', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return data as {
    access_token: string;
    id_token: string;
  };
};

export const getGoogleUserInfo = async (access_token: string, id_token: string): Promise<GoogleUserResult> => {
  try {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      params: {
        access_token,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer ${id_token}`
      }
    });

    return data;
  } catch (error: any) {
    console.log(error, 'Error fetching Google user');
    throw new Error(error.message);
  }
};
