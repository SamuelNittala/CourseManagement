require('dotenv').config()

const express = require('express')
const bcrpyt = require('bcrypt')
const pool = require('../db/db')
const jwt = require('jsonwebtoken')

const app = express()
const port = 4041
app.use(express.json())

app.post('/login',async (req,res)=>{
	const {name,password} = req.body
	const find_query = "SELECT * from account WHERE name = $1"
	const db_data = await pool.query(find_query,[name])

	if (db_data.rows.length==0) {
		return res.status(400).send('Cannot find user')
	}
	const db_pwd = db_data.rows[0].password
	try {
		if (await bcrpyt.compare(password,db_pwd)) {
			const user = {name: name}
			const accessToken = generateToken(user)

			res.json({accessToken: accessToken})
		}
		else {
			res.send('Invalid Password!')
		}
	}
	catch {
		res.status(500).send()
	}
})

function generateToken(user) {
	return jwt.sign(user,process.env.ACCESS_TOKEN_SECRET)	
}
app.listen(port)