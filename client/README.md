# MERN Blog Project

A full-stack web application built with the MERN stack (MongoDB, Express.js, React, Node.js) that allows users to create, publish, and view blog posts dynamically.

## Frontend routes

- `/` displays the latest stories and, when signed in, the create-post form.
- `/signin` displays the sign-in form.
- `/signup` displays the account registration form.

The client uses React Router. When deploying to a static web server, configure it to serve `index.html` for these client-side routes so direct links and page refreshes work.

Set `REACT_APP_API_URL` to the backend origin if it differs from `http://localhost:5000`.

## Features
- Create and publish new stories/blog posts with titles, text contents, and cover images.
- Real-time data persistence using MongoDB database.
- RESTful API backend built with Node.js and Express.
- Dynamic frontend UI built with React.

## Getting Started

### Prerequisites
- Node.js installed on your system
- MongoDB connection configured

### Installation & Running

1. Start the Backend Server:
   cd server
   npm install
   npm run dev

2. Start the Frontend Client:
   cd client
   npm install
   npm start