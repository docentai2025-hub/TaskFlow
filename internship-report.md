# FULL-STACK WEB DEVELOPMENT INTERNSHIP PROJECT REPORT

## Project Title
**TaskFlow — Student Task Management System**

**Submitted by:** [Your Name]  
**Course/Branch:** [Course and Branch]  
**College:** [College Name]  
**Internship Organization:** [Organization Name]  
**Internship Duration:** [Start Date – End Date]  
**Faculty/Industry Guide:** [Guide Name]

> Fill in the bracketed information. Revise statements to reflect the work you personally performed and what you can demonstrate.

## 1. Abstract

TaskFlow is a full-stack web application designed to help students manage academic and personal tasks through a single interface. The system supports user registration and login, creation and modification of tasks, priority selection, due dates, task-status tracking, search, and filtering. It uses HTML5, CSS3, and JavaScript for the frontend, Node.js for the backend, and SQLite for data storage. The backend exposes REST-style API endpoints that handle user authentication and task operations. Each student's data is stored separately and remains available after restarting the application. The project demonstrates the integration of frontend interfaces, backend logic, database management, and basic application security concepts.

## 2. Introduction

Students often manage numerous activities such as assignments, project submissions, examination preparation, and personal reminders. Keeping track of these responsibilities manually can lead to missed deadlines and poor organization. The TaskFlow application provides a centralized platform where students can create tasks, assign priorities, update progress, and monitor pending work using a web browser.

The application illustrates the basic working principles of a full-stack system. The browser provides a user-friendly interface, the backend processes requests, and SQLite stores records persistently.

## 3. Problem Statement

Manual task tracking using notebooks or scattered notes makes it difficult to monitor completion status, prioritize urgent work, and view upcoming deadlines. A simple, accessible web-based solution is needed to organize tasks and display progress in one place.

## 4. Objectives

- Develop a responsive and user-friendly task management interface.
- Implement user registration, login, and logout.
- Perform Create, Read, Update, and Delete (CRUD) operations on tasks.
- Store user and task information in an SQLite database.
- Provide priority levels, status tracking, due dates, search, and filters.
- Demonstrate client–server communication using REST-style APIs and JSON.

## 5. Technology Used

**HTML5:** Creates the structure of the pages, forms, and task sections.  
**CSS3:** Provides responsive page layouts, colors, cards, and styling.  
**JavaScript:** Processes user actions, validates forms in the browser, calls backend APIs, and updates the displayed content.  
**Node.js:** Runs the backend server and handles client requests.  
**SQLite:** Stores user accounts, sessions, and task records in a local relational database.  
**VS Code / Browser:** Can be used for development, debugging, and testing.

## 6. System Architecture

```text
           STUDENT / WEB BROWSER
                    |
                    v
         HTML + CSS + JAVASCRIPT
                    |
               Fetch API
              (JSON / HTTP)
                    |
                    v
           NODE.JS BACKEND
    (Routing, Validation, Sessions)
                    |
                    v
              SQLITE DATABASE
         (Users, Sessions, Tasks)
```

**Working:** The student interacts with the frontend. JavaScript sends API requests to the Node.js backend. The server validates requests, checks the signed-in session, and performs database operations. It sends JSON responses back to the browser, which updates the task list and dashboard automatically.

## 7. Modules

### 7.1 User Authentication

A user can create an account using their name, email, and password. Passwords are stored as scrypt-derived hashes rather than plaintext. After a successful login, the backend sets an HTTP-only session cookie, allowing the student to access their task data. Logout invalidates the session.

### 7.2 Task Management

The task module allows students to add a task with a title, optional description, priority, status, and due date. Existing tasks can be edited or deleted. Data is stored in SQLite so the task list remains available between sessions.

### 7.3 Dashboard

The dashboard displays the total number of tasks, tasks pending, tasks in progress, and tasks completed. These summary counts update when tasks change.

### 7.4 Search and Filtering

Students can search task titles and descriptions and filter by active or completed status. Tasks whose due dates have passed are labeled as overdue unless marked completed.

## 8. Database Design

### Table 1: `users`

| Column | Purpose |
|---|---|
| id | Unique identifier, primary key |
| name | Student's name |
| email | Unique email address |
| password_hash | Salted password hash |
| created_at | Registration timestamp |

### Table 2: `tasks`

| Column | Purpose |
|---|---|
| id | Unique task identifier, primary key |
| user_id | References owner in users table |
| title | Task heading |
| description | Optional details |
| priority | low / medium / high |
| status | pending / in_progress / completed |
| due_date | Optional due date |
| created_at | Record creation time |
| updated_at | Record modification time |

### Table 3: `sessions`

Stores a one-way hash of the user's session token, the associated user ID, and the session expiration time.

**Relationship:** One user can have many tasks (one-to-many). Each task belongs to one user.

## 9. Functional Requirements

1. The system shall allow users to register and log in.
2. The system shall allow authenticated users to create and view tasks.
3. The system shall allow users to edit and delete only their own tasks.
4. The system shall store priority, status, and due-date values for each task.
5. The system shall display task counts and allow basic search and filtering.
6. The system shall preserve records after the application is restarted.

## 10. Non-Functional Requirements

- **Usability:** A clear, readable interface with straightforward forms.
- **Responsiveness:** Layout adapts to desktop and mobile screen sizes.
- **Data integrity:** Database foreign keys and field constraints help protect records.
- **Basic security:** Password hashing, server-side authentication, and account-specific queries.
- **Maintainability:** Separate frontend files and backend server logic.

## 11. Implementation Steps

1. Identify requirements and design the task interface.
2. Create HTML pages and responsive CSS styling.
3. Write JavaScript for forms, task rendering, and HTTP requests.
4. Set up the Node.js HTTP server and API routes.
5. Create SQLite database tables for users, sessions, and tasks.
6. Connect frontend actions to the backend using the Fetch API.
7. Add login verification and user-specific database access.
8. Test creation, editing, completion, deletion, and filtering of tasks.

## 12. Example Test Cases (perform and record your results)

| Test case | Expected result |
|---|---|
| Register with valid details | New account is created |
| Register with existing email | Error message appears |
| Log in with incorrect password | Access is denied |
| Add a task | New task appears on dashboard |
| Edit task priority | Priority changes and persists |
| Mark task completed | Completed count increases |
| Search for task | Matching tasks are displayed |
| Delete task | Task is removed from list |
| Restart server and sign in | Previous tasks are still available |
| Try accessing another user's task | Server rejects the operation |

## 13. Screenshots / Output

**Insert real screenshots from your running application:**

- Figure 1: Login page
- Figure 2: Registration page
- Figure 3: Task dashboard
- Figure 4: Create Task window
- Figure 5: Edit Task window
- Figure 6: Completed tasks filter

## 14. Advantages

TaskFlow provides a simple platform for personal productivity, a responsive interface, persistent task storage, basic data separation between users, and an easy-to-understand project structure suitable for a full-stack development demonstration.

## 15. Limitations

This is an educational project that runs locally on a Node.js server. It does not send email reminders, support team collaboration, or provide advanced analytics. Public deployment would require additional production security measures such as HTTPS, rate limiting, CSRF protection, and comprehensive testing.

## 16. Future Scope

The application can be enhanced with notifications before due dates, categories, calendar integration, team workspaces, progress charts, and cloud hosting.

## 17. Conclusion

TaskFlow demonstrates the key components of full-stack web development through a practical student task management application. The project combines frontend design, asynchronous API requests, server-side programming, authentication, and relational database operations. The implementation provides a foundation for understanding how user interfaces, backend services, and databases work together in real-world web applications.

## 18. References

- Node.js Documentation: https://nodejs.org/docs/latest/api/
- MDN Web Docs: https://developer.mozilla.org/
- SQLite Documentation: https://www.sqlite.org/docs.html

**Academic integrity note:** This report is a starting template. Update it to match your internship's actual work, include your own screenshots/testing results, and follow your college's prescribed format.
