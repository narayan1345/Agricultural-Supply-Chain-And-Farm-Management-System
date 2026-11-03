-- Database-level role model: each user is assigned a role in users.role_id.
-- Application API enforces row ownership using the authenticated user id and role.
-- For a deployment with separate DB accounts, use the following least-privilege accounts.
USE agritrack_db;
CREATE USER IF NOT EXISTS 'agritrack_readonly'@'localhost' IDENTIFIED BY 'ChangeMe_ReadOnly_123!';
GRANT SELECT ON agritrack_db.* TO 'agritrack_readonly'@'localhost';
CREATE USER IF NOT EXISTS 'agritrack_app'@'localhost' IDENTIFIED BY 'ChangeMe_App_123!';
GRANT SELECT,INSERT,UPDATE,DELETE,EXECUTE ON agritrack_db.* TO 'agritrack_app'@'localhost';
FLUSH PRIVILEGES;
-- Change both example passwords before use outside a local demo environment.
