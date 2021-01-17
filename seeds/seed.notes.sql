BEGIN;

INSERT INTO notes (name, content, folder_id)
VALUES
('One', 'lorem ipsum', 1),
('Two', 'ipsum dipsum', 1),
('Three', 'lalala', 3),
('Four', 'fourth note in fourth folder', 4),
('Five', 'this note', 4);

COMMIT;