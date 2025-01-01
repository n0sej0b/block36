const {
    client,
    createTables,
    createUser,
    createSkill,
    fetchUsers,
    fetchSkills,
    createUserSkill,
    fetchUserSkills,
    deleteUserSkill,
    authenticate,
    findUserByToken
  } = require('./db');
  
  const { isLoggedIn } = require('./middleware');
  
  
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  
  const path = require('path');
  app.get('/', (req, res)=> res.sendFile(path.join(__dirname, '../client/dist/index.html')));
  app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets'))); 
  
  
  app.post('/api/auth/login', async(req, res, next)=> {
    try {
      res.send(await authenticate(req.body));
    }
    catch(ex){
      next(ex);
    }
  });
  
  app.get('/api/auth/me', isLoggedIn, async(req, res, next)=> {
    try {
      res.send(await findUserByToken(req.headers.authorization));
    }
    catch(ex){
      next(ex);
    }
  });
  
  app.get('/api/skills', async(req, res, next)=> {
    try {
      res.send(await fetchSkills());
    }
    catch(ex){
      next(ex);
    }
  });
  
  app.get('/api/users', isLoggedIn, async(req, res, next)=> {
    try {
      res.send(await fetchUsers());
    }
    catch(ex){
      next(ex);
    }
  });
  
  app.get('/api/users/:id/userSkills', isLoggedIn, async(req, res, next)=> {
    try {
      res.send(await fetchUserSkills(req.params.id));
    }
    catch(ex){
      next(ex);
    }
  });
  
  app.delete('/api/users/:userId/userSkills/:id', isLoggedIn, async(req, res, next)=> {
    try {
      await deleteUserSkill({ user_id: req.params.userId, id: req.params.id });
      res.sendStatus(204);
    }
    catch(ex){
      next(ex);
    }
  });
  
  app.post('/api/users/:id/userSkills', isLoggedIn, async(req, res, next)=> {
    try {
      res.status(201).send(await createUserSkill({user_id: req.params.id, skill_id: req.body.skill_id}));
    }
    catch(ex){
      next(ex);
    }
  });
  
  app.use((err, req, res, next)=> {
    console.log(err);
    res.status(err.status || 500).send({ error: err.message || err });
  });
  
  const seed = async () => {
    try {
      await createTables();
      console.log('Tables created successfully');
  
      const [bill, sam, nora, dunkin, sprinting, vault, hurdles, polevolt] = await Promise.all([
        createUser({ username: 'bill', password: process.env.SEED_PASSWORD || 'bill_pw'}),
        createUser({ username: 'sam', password: process.env.SEED_PASSWORD || 'sam_pw'}),
        createUser({ username: 'nora', password: process.env.SEED_PASSWORD || 'nora_pw'}),
        createUser({ username: 'dunkin', password: process.env.SEED_PASSWORD || 'dunkin_pw'}),
        createSkill({ name: 'sprinting'}),
        createSkill({ name: 'vault'}),
        createSkill({ name: 'hurdles'}),
        createSkill({ name: 'polevolt'})
      ]);
  
      const userSkills = await Promise.all([
        createUserSkill({ user_id: bill.id, skill_id: hurdles.id}),
        createUserSkill({ user_id: bill.id, skill_id: sprinting.id}),
        createUserSkill({ user_id: dunkin.id, skill_id: vault.id}),
        createUserSkill({ user_id: dunkin.id, skill_id: polevolt.id})
      ]);
  
      console.log('Data seeded successfully');
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  };
  
 
  const init = async () => {
    try {
      console.log('Connecting to database...');
      await pool.connect();
      console.log('Database connected successfully');
  
      if (process.env.SEED_DB === 'true') {
        await seed();
      }
  
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };
  
  
  init();