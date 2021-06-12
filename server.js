require('dotenv').config()

const express = require('express')
const bcrpyt = require('bcrypt')
const pool = require('./db/db')
const courseRouter = require('./routes/course')

const app = express()
const port = 4040 
const authHelper = require('./auth/authHelper')

app.use(express.json())
app.use('/course',courseRouter)

app.post('/register', async (req,res) => {
	try{
		const {name,password,teacher} = req.body
		const hashed_password = await bcrpyt.hash(password,10)

		const insert_query = "INSERT INTO account (name,password,teacher) VALUES ($1,$2,$3) RETURNING *"
		const new_user = await pool.query(insert_query,[name,hashed_password,teacher])

		res.json(new_user)
	}
	catch {
		res.status(500).send()
	}
})

app.post('/register-course',authHelper,async(req,res) => {
	const user = req.user
	const {course_name} = req.body;
	const name = user.name
	const find_user_query = "SELECT account_id from account where name = $1"	
	const current_user = await pool.query(find_user_query,[name])
	const user_id = current_user.rows[0].account_id
	
	const find_course_query = "SELECT course_id from course where course_name = $1" 
	const course_to_register = await pool.query(find_course_query,[course_name])

	const course_data = course_to_register.rows
	if (course_data.length == 0) res.send('Course not found!')
	
	const course_id = course_data[0].course_id
	
	const insert_query = "INSERT INTO enrolled (course_id,account_id) VALUES ($1,$2) RETURNING *"
	const registered_query = await pool.query(insert_query,[course_id,user_id])
	
	res.json(registered_query)
})

app.listen(port, () => {
	console.log(`Listening on port ${port}`)
})