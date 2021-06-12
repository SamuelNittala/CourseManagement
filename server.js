require('dotenv').config()

const express = require('express')
const bcrpyt = require('bcrypt')
const pool = require('./db/db')

const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const courseRouter = require('./routes/course')

const app = express()
const port = 4040 
const authHelper = require('./auth/authHelper')

const swaggerOptions = {
	swaggerDefinition: {
		info: {
			title: 'Class Management API',
			description: 'API to manage courses for independent instructors',
			contact: {
				name: 'Samuel Nittala'
			},
			servers: [`http://localhost:${port}`]
		}
	},
	apis:["server.js","routes/course.js"]
}
const swaggerDocs = swaggerJsDoc(swaggerOptions)
app.use('/api-docs',swaggerUi.serve,swaggerUi.setup(swaggerDocs))

app.use(express.json())
app.use('/course',courseRouter)
/**
 * @swagger
 * /register:
 *   post:
 *    description: Register to the website
 *    responses:
 *      '200':
 *        description: Successfully registered
 *      '500':
 *        description: Error registering the user.
 */
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
/**
 * @swagger
 * /register-course:
 *  post:
 *   description: Allows students to register to a course.
 *   responses:
 *    '200':
 *      description: Successfully registered a student to a course. 
 *    '403':
 *      description: Error finding a course.
 */
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
	if (course_data.length == 0) res.status(403).send('Course not found!')
	
	const course_id = course_data[0].course_id
	
	const insert_query = "INSERT INTO enrolled (course_id,account_id) VALUES ($1,$2) RETURNING *"
	const registered_query = await pool.query(insert_query,[course_id,user_id])
	
	res.json(registered_query)
})
/**
 * @swagger
 * /student:
 *  delete:
 *   description: Removes a student from a particular course.
 *   parameters:
 *   - in: body
 *     name: cid
 *     description: Course id
 *   - in: body
 *     name: sid
 *     description: Student id
 *   responses:
 *    '200':
 *      description: Deletion Successful. 
 *    '401':
 *      description: User not found or student is not enrolled to that course.
 *    '403':
 *      description: current instructor does not manage the particular case
 */
app.delete('/student/:cid-:sid',authHelper,async(req,res) => {
	const user = req.user
	const student_id = req.params.sid, course_id = req.params.cid

	const find_instructor = "SELECT instructor_name FROM course WHERE course_id = $1"
	const instructor_data = await pool.query(find_instructor,[course_id])

	if (instructor_data.rows.length == 0) res.status(401).send("Invalid Operation!")
	else if (instructor_data.rows[0].instructor_name != user.name) res.status(403).send('You dont manage this course!')

	const delete_query = "DELETE FROM enrolled WHERE course_id=$1 and account_id=$2"	
	const delete_operation = await pool.query(delete_query,[course_id,student_id]) 

	res.send('Deletion success')
})
app.listen(port, () => {
	console.log(`Listening on port ${port}`)
})