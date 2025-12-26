-- Seed data for testing
INSERT INTO tenants (name, slug, description, website, status) VALUES
('Demo Tenant', 'demo-tenant', 'Demo tenant for testing', 'https://demo.example.com', 'active'),
('Test Org', 'test-org', 'Test organization', 'https://test.example.com', 'active');

INSERT INTO users (tenant_id, email, password, first_name, last_name, role, status) VALUES
(1, 'admin@demo.example.com', '$2b$10$SomeHashedPasswordHere', 'Admin', 'User', 'admin', 'active'),
(1, 'user@demo.example.com', '$2b$10$SomeHashedPasswordHere', 'Test', 'User', 'user', 'active'),
(2, 'admin@test.example.com', '$2b$10$SomeHashedPasswordHere', 'Admin', 'User', 'admin', 'active');

INSERT INTO projects (tenant_id, name, description, status, created_by) VALUES
(1, 'Demo Project', 'First demo project', 'active', 1),
(2, 'Test Project', 'First test project', 'active', 3);

INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, created_by) VALUES
(1, 'Setup Database', 'Configure PostgreSQL', 'open', 'high', 2, 1),
(1, 'Create API', 'Build REST API endpoints', 'open', 'high', 2, 1),
(2, 'Design UI', 'Create UI mockups', 'open', 'medium', NULL, 3);
