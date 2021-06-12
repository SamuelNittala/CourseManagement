const express = require('express')
const router = express.Router()
const pool = require('../db/db')
const authenticateToken = require('../auth/authHelper')

router.get('/',authenticateToken,async (req,res) => {
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
			res.json({"courses_taught":courses_taught.rows})
		}
		else {
			const find_course_query =
				"SELECT * FROM enrolled INNER JOIN course ON enrolled.course_id=course.course_id "+
					"where enrolled.account_id = $1"
			const courses_registered = await pool.query(find_course_query,[user_data.account_id])	
			res.json({"courses_enlisted_to":courses_registered.rows})
		}
	}
	catch {
		res.status(500).send()
	}
})

router.post('/',authenticateToken,async (req,res) => {
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
		res.json(new_course.rows[0])
	}
	catch {
		res.status(500).send()
	}
})

router.delete('/',authenticateToken,async (req,res) => {
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
		res.json('Deletion Successful')
	}
	catch{
		res.status(500).send()
	}
})

module.exports = router;
