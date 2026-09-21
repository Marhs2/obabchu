'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'obabchu-dev-secret-change-me';
const COOKIE_NAME = 'obabchu_token';
const TOKEN_TTL = '7d';

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function readUser(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function optionalAuth(req, _res, next) {
  req.user = readUser(req);
  next();
}

function requireAuth(req, res, next) {
  const user = readUser(req);
  if (!user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  req.user = user;
  next();
}

const insertUser = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
const findByUsername = db.prepare('SELECT * FROM users WHERE username = ?');

router.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }
  if (String(username).trim().length < 3) {
    return res.status(400).json({ error: '아이디는 3자 이상이어야 합니다.' });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
  }
  const uname = String(username).trim();
  if (findByUsername.get(uname)) {
    return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
  }
  const hash = bcrypt.hashSync(String(password), 10);
  const info = insertUser.run(uname, hash);
  const user = { id: info.lastInsertRowid, username: uname };
  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: { id: user.id, username: user.username } });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }
  const row = findByUsername.get(String(username).trim());
  if (!row || !bcrypt.compareSync(String(password), row.password)) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }
  const user = { id: row.id, username: row.username };
  setAuthCookie(res, signToken(user));
  res.json({ user });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const user = readUser(req);
  res.json({ user: user ? { id: user.id, username: user.username } : null });
});

module.exports = { router, requireAuth, optionalAuth };
