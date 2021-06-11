require('dotenv').config()

const express = require('express')
const bcrpyt = require('bcrypt')
const pool = require('./db')
const jwt = require('jsonwebtoken')

const app = express()
const port = 4040 

app.use(express.json())

app.post('/register', async (req,res) => {
	try{
		const {name,password,isTeacher} = req.body
		const hashed_password = await bcrpyt.hash(password,10)

		const insert_query = "INSERT INTO account (name,password,isTeacher) VALUES ($1,$2,$3) RETURNING *"
		const new_user = await pool.query(insert_query,[name,hashed_password,isTeacher])

		res.json(new_user)
	}
	catch {
		res.status(500).send()
	}
})

app.post('/login',async (req,res)=>{
	const {name,password} = req.body
	const find_query = "SELECT * from account WHERE name = $1"
	const db_data = await pool.query(find_query,[name])
	const db_name = db_data.rows[0].name,db_pwd = db_data.rows[0].password
	if (db_name == null) {
		return res.status(400).send('Cannot find user')
	}
	try {
		if (await bcrpyt.compare(password,db_pwd)) {
			const user = {name: name}
			const accessToken = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET)
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

app.post('/course', async (req,res) => {
	try {
		const {course_name,instructor_name} = req.body
		const insert_query = 
		"INSERT INTO course (course_name,instructor_name,account_id) VALUES ($1,$2,$3) RETURNING *"
		const new_course = await pool.query(insert_query,[course_name,instructor_name])
	}
	catch {
		res.status(500).send()
	}
})

app.get('/class',(req,res) => {

})

app.listen(port, () => {
	console.log(`Listening on port ${port}`)
})