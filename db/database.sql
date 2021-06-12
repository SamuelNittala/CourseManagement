CREATE DATABASE homejam;

CREATE TABLE account(
	account_id SERIAL PRIMARY KEY,
	name VARCHAR(255) UNIQUE,
	password VARCHAR(255),
	isTeacher BOOLEAN
);

CREATE TABLE course(
	course_id SERIAL PRIMARY KEY,
	course_name VARCHAR(255),
	instructor_name VARCHAR(255),	
	account_id INT
);

CREATE TABLE enrolled(
	enroll_id SERIAL PRIMARY KEY,
	account_id INT,
	course_id INT
);