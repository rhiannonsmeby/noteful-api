const knex = require('knex');
const app = require('../src/app');
const { makeNotesArray } = require('./notes.fixtures');
const { makeFoldersArray } = require('./folders.fixtures');

describe('Notes Endpoints', () => {
    let db;

    before('Make the knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL
        });
        app.set('db', db);
    });

    after('disconnect from the database', () => db.destroy());

    before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'));

    afterEach('cleanup folders', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'));

    describe('GET /api/notes', () => {
        context('given there are no notes in the folder', () => {
            it('returns a 200 and an empty array', () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200, []);
            })
        })

        context('given there are notes in folder', () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();

            beforeEach('add note', () => {
                return db
                    .into('folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                        .into('notes')
                        .insert(testNotes)
                    })
            });

            it('returns a 200 and all notes', () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200, testNotes);
            });
        });
    });

    describe('GET api/note/:note_id', () => {
        context('when there are no notes in the database', () => {
            it('returns a 404 and an error for the note', () => {
                const testId = 2000;

                return supertest(app)
                    .get(`/api/notes/${testId}`)
                    .expect(404)
                    .expect({
                        error: { message: 'Note does not exist' }
                    });
            });
        });
    });

    describe('POST /api/notes', () => {
        const testFolders = makeFoldersArray();

        beforeEach('Add Folders', () => {
            return db.into('folders')
                .insert(testFolders);
        });

        it('returns a 201 when a the test note has been passed through', () => {
            const newNote = {
                name: 'Test Note',
                content: 'Test Content',
                folder_id: 2,
            };

            return supertest(app)
                .post('/api/notes')
                .send(newNote)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newNote.note_name);
                    expect(res.body.content).to.eql(newNote.content);
                    expect(res.body.folder_id).to.eql(Number(newNote.folder_id));
                    expect(res.body).to.have.property('id');
                })
                .then(postRes => {
                    return supertest(app)
                        .get(`/api/notes/${postRes.body.id}`)
                        .expect(postRes.body);
                });
        });

        const requiredFields = ['name', 'content', 'folder_id'];
        requiredFields.forEach(field => {
            const newNote = {
                name: 'test note',
                content: 'please ignore',
                folder_id: 2
            };

            it(`responds with a 400 and an error message when the '${field}' is missing`, () => {
                delete newNote[field];

                return supertest(app)
                    .post('/api/notes')
                    .send(newNote)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    });
            });
        });
    });

    describe('DELETE /api/note/:note_id', () => {
        context('When there are no notes in the database', () => {
            it('returns a 404 and associate error', () => {
                const testId = 1612;
                return supertest(app)
                    .delete(`/api/notes/${testId}`)
                    .expect(404)
                    .expect({
                        error: { message: 'Note does not exist' }
                    });
            });
        });

        context('When there are folders and notes in the database', () => {
            const testFolders = makeFoldersArray();

            beforeEach('add folders to the database', () => {
                return db.into('folders')
                    .insert(testFolders);
            });

            beforeEach('add notes to database', () => {
                const testNotes = makeNoteArray();
                return db.into('notes')
                    .insert(testNotes);
            });

            it('returns a 204 and the note is not in a get request', () => {
                const testNotes = makeNotesArray();
                const idToRemove = 2;
                const expectedArray = testNotes.filter(note => note.id != idToRemove);

                return supertest(app)
                    .delete(`/api/notes/${idToRemove}`)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/notes`)
                            .expect(200, expectedArray)
                    );
            });
        });
    });
});