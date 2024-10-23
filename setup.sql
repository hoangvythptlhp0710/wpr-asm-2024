-- Create Users table
CREATE TABLE IF NOT EXISTS Users ( 
    fullname VARCHAR(255) NOT NULL,
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Create Emails table
CREATE TABLE IF NOT EXISTS Emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES Users(id),
    FOREIGN KEY (receiver_id) REFERENCES Users(id)
);

-- Insert users
INSERT INTO Users (email, password) VALUES 
('a@a.com', '123'),
('b@b.com', 'password1'),
('c@c.com', 'password2');

-- Insert emails
INSERT INTO Emails (sender_id, receiver_id, subject, body) VALUES
((SELECT id FROM Users WHERE email = 'a@a.com'), (SELECT id FROM Users WHERE email = 'b@b.com'), 'Subject 1', 'Message body 1'),
((SELECT id FROM Users WHERE email = 'a@a.com'), (SELECT id FROM Users WHERE email = 'c@c.com'), 'Subject 2', 'Message body 2'),
((SELECT id FROM Users WHERE email = 'b@b.com'), (SELECT id FROM Users WHERE email = 'a@a.com'), 'Subject 3', 'Message body 3'),
((SELECT id FROM Users WHERE email = 'c@c.com'), (SELECT id FROM Users WHERE email = 'a@a.com'), 'Subject 4', 'Message body 4'),
((SELECT id FROM Users WHERE email = 'b@b.com'), (SELECT id FROM Users WHERE email = 'c@c.com'), 'Subject 5', 'Message body 5'),
((SELECT id FROM Users WHERE email = 'c@c.com'), (SELECT id FROM Users WHERE email = 'b@b.com'), 'Subject 6', 'Message body 6'),
((SELECT id FROM Users WHERE email = 'a@a.com'), (SELECT id FROM Users WHERE email = 'b@b.com'), 'Subject 7', 'Message body 7'),
((SELECT id FROM Users WHERE email = 'b@b.com'), (SELECT id FROM Users WHERE email = 'a@a.com'), 'Subject 8', 'Message body 8');

