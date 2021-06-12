require('dotenv').config()

const express = require('express')
const bcrpyt = require('bcrypt')
const pool = require('./db/db')
const jwt = require('jsonwebtoken')

const app = express()
const port = 4040 

app.use(express.json())

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
function authenticateToken(req,res,next) {
	const authHeader = req.headers['authorization']
	const token = authHeader && authHeader.split(' ')[1]

	if (token == null) return res.sendStatus(401)

	jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,user) => {
		if (err) return res.sendStatus(403)
		req.user = user
		next()
	})
}

app.post('/course', authenticateToken ,async (req,res) => {
	if (req.body.instructor_name !== req.user.name) res.send('Invalid Operation!') 	

	const find_query = "SELECT * from account where name = $1"
	const current_user = await pool.query(find_query,[req.user.name])

	if(!current_user.rows[0].teacher) res.send('Cannot add course as a student, try registering to a course!')
	const current_user_id = current_user.rows[0].account_id
	try {
		const {course_name,instructor_name} = req.body
		const insert_query = 
		"INSERT INTO course (course_name,instructor_name,account_id) VALUES ($1,$2,$3) RETURNING *"
		const new_course = await pool.query(insert_query,[course_name,instructor_name,current_user_id])
		res.json(new_course)
	}
	catch {
		res.status(500).send()
	}
})

app.post('/register-course',authenticateToken,async(req,res) => {
	const user = req.user
	const {course_name,name} = req.body;
	if (name != user.name) res.send("Unauthorized!")	

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

app.get('/course',authenticateToken,async(req,res) => {
	const user = req.user
	const find_query = "SELECT * from account WHERE name = $1"
	const current_user = await pool.query(find_query,[user.name])
	const user_data = current_user.rows[0]
	try {
		if (user_data.teacher) {
			const find_course_query = 
				"SELECT course_name from account INNER JOIN course ON course.account_id=account.account_id "+ 
					"where account.account_id = $1"
			const courses_taught = await pool.query(find_course_query,[user_data.account_id])
			res.json(courses_taught)
		}
		else {
			const find_course_query =
				"SELECT * FROM enrolled INNER JOIN course ON enrolled.course_id=course.course_id "+
					"where enrolled.account_id = $1"
			const courses_registered = await pool.query(find_course_query,[user_data.account_id])	
			res.json(courses_registered)
		}
	}
	catch {
		res.status(500).send()
	}
})

app.delete('/course',authenticateToken,async(req,res) => {
	const user = req.user
	const {course_name} = req.body		

	const find_instructor_query = "SELECT account_id,course_id from course where course_name = $1"
	const instructor_data = await pool.query(find_instructor_query,[course_name])

	if (instructor_data.rows.length==0) res.send('Cannot find the course!')

	const instructor_id = instructor_data.rows[0].account_id
	const course_id = instructor_data.rows[0].course_id

	const current_instructor_data = "SELECT * from account where account_id = $1"
	const current_instructor= await pool.query(current_instructor_data,[instructor_id])

	const instructor_data_ref = current_instructor.rows[0]

	if (instructor_data_ref.name != user.name || !instructor_data_ref.teacher) res.send('Cannot perform that action!')
	try {
		const delete_query= "DELETE from course where course_id= $1"	
		const delete_course = await pool.query(delete_query,[course_id])
		res.json(delete_course)
	}
	catch{
		res.status(500).send()
	}
})

app.listen(port, () => {
	console.log(`Listening on port ${port}`)
})