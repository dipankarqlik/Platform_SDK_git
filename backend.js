const path = require('path');
const process = require('process');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const enigma = require('enigma.js');
const schema = require('enigma.js/schemas/12.612.0');
const WebSocket = require('ws');
const { Auth, AuthType } = require('@qlik/sdk');

const envVars = ['QCS_SERVER', 'QCS_API_KEY'];
for (let i = 0; i < envVars.length; i += 1) {
  if (!(envVars[i] in process.env)) {
    console.log(`Missing environment variable: ${envVars[i]}`);
    process.exit(1);
  }
}

const auth = new Auth({
  authType: AuthType.APIKey,
  host: process.env.QCS_SERVER,
  apiKey: process.env.QCS_API_KEY,
});
const apiKey = process.env.QCS_API_KEY;

(async () => {
  // get user
  try {
    const res = await auth.rest('/users/me');
    if (res.status !== 200) {
      console.log('Failed to get /users/me');
      process.exit(1);
    }
    const userData = await res.json();
    console.log(`Logged in as: ${userData.name}`);
  } catch (error) {
    console.log('Error on get /users/me');
    console.log(error);
  }

  let id;
  // create app
  try {
    const appPostRes = await auth.rest('/apps', {
      method: 'post',
      body: {},
    });
    const app = await appPostRes.json();
    console.log('Created App:');
    console.log(app);
    ({ id } = app.attributes);
  } catch (error) {
    console.log('Error on post /apps');
    console.log(error);
  }

  try {
    // change name of app
    const newName = 'changedName';
    const appPutRes = await auth.rest(`/apps/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ attributes: { name: newName } }),
    });
    const updatedApp = await appPutRes.json();
    console.log('Changed app name:');
    console.log(updatedApp);
  } catch (error) {
    console.log('Error on put /apps');
    console.log(error);
  }

  // connect to engine
  const wssUrl = await auth.generateWebsocketUrl(id);
  console.log(wssUrl);
  const session = enigma.create({
    schema,
    createSocket: () => new WebSocket(wssUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    }),
  });
  // bind traffic events to log what is sent and received on the socket:
  session.on('traffic:sent', (data) => console.log('sent:', data));
  session.on('traffic:received', (data) => console.log('received:', data));
  try {
    await session.open();
    console.log('Session opened');
    await session.close();
    console.log('Session closed');
  } catch (err) {
    console.log('Session error:', err);
  }

  // delete app
//   try {
//     const deleteRes = await auth.rest(`/apps/${id}`, { method: 'delete' });
//     console.log('Delete status:');
//     console.log(deleteRes.status);
//   } catch (error) {
//     console.log('Error on delete /apps');
//     console.log(error);
//   }

//   // attempt get after delete
//   console.log('Get after delete should throw error');
//   try {
//     await auth.rest(`/apps/${id}`);
//   } catch (error) {
//     console.log('Error thrown correctly');
//   }
})();