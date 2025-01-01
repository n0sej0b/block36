const pg = require('pg');
const client = new pg.Client({
  user: 'postgres',
  password: 'password',
  host: 'localhost',
  port: 5432,
  database: 'acme_talent_agency_db',
});
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecrettoken';

const createTables = async()=> {
  const SQL = `
    DROP TABLE IF EXISTS user_skills;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS skills;
    CREATE TABLE users(
      id UUID PRIMARY KEY,
      username VARCHAR(20) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );
    CREATE TABLE skills(
      id UUID PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    );
    CREATE TABLE user_skills(
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      skill_id UUID REFERENCES skills(id) NOT NULL,
      CONSTRAINT unique_user_id_skill_id UNIQUE (user_id, skill_id)
    );
  `;
  await client.query(SQL);

};

const createUser = async({ username, password })=> {
  const SQL = `
    INSERT INTO users(id, username, password) VALUES($1, $2, $3) RETURNING *
  `;
  const response = await client.query(SQL, [ uuid.v4(), username, await bcrypt.hash(password, 5)]);
  return response.rows[0];
};

const createSkill = async({ name })=> {
  const SQL = `
    INSERT INTO skills(id, name) VALUES ($1, $2) RETURNING * 
  `;
  const response = await client.query(SQL, [ uuid.v4(), name]);
  return response.rows[0];
};

const authenticate = async({ username, password })=> {
  const SQL = `
    SELECT id, password
    FROM users
    WHERE username = $1
  `;
  const response = await client.query(SQL, [ username ]);
  if(!response.rows.length){
    const error = Error('not authorized');
    error.status = 401;
    throw error;
  }

  const user = response.rows[0];

  // compare user provided pw to hash in db
  console.log(password, user.password);
  const validPassword = await bcrypt.compare(password, user.password);
  if(!validPassword) {
    throw new Error("wrong passsword, dude!")
  }

  // generate a jwt
  const token = jwt.sign({ id: user.id }, JWT_SECRET);

  return { token };
};

const createUserSkill = async({ user_id, skill_id })=> {
  const SQL = `
    INSERT INTO user_skills(id, user_id, skill_id) VALUES ($1, $2, $3) RETURNING * 
  `;
  const response = await client.query(SQL, [ uuid.v4(), user_id, skill_id]);
  return response.rows[0];
};

const fetchUsers = async()=> {
  const SQL = `
    SELECT id, username 
    FROM users
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchSkills = async()=> {
  const SQL = `
    SELECT *
    FROM skills
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchUserSkills = async(user_id)=> {
  const SQL = `
    SELECT *
    FROM user_skills
    WHERE user_id = $1
  `;
  const response = await client.query(SQL, [ user_id ]);
  return response.rows;
};

const deleteUserSkill = async({user_id, id})=> {
  const SQL = `
    DELETE
    FROM user_skills
    WHERE user_id = $1 AND id = $2
  `;
  await client.query(SQL, [ user_id, id ]);
};

const findUserByToken = async(token) => {
  // validate the token
  const { id } = jwt.verify(token, JWT_SECRET);

  const SQL = `
    SELECT id, username
    FROM users
    WHERE id = $1
  `;
  const response = await client.query(SQL, [id]);
  if(!response.rows.length){
    const error = Error('not authorized');
    error.status = 401;
    throw error;
  }
  return response.rows[0];

}

module.exports = {
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
};