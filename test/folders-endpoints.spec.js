const knex = require('knex')
const app = require('../src/app')
const {makeFoldersArray} = require('./folders.fixtures')

describe('Folders Endpoints', function() {
    let db 

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

    afterEach('cleanup', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

    describe('/GET /api/folders', () => {
        context('given no folders', () => {
            it('returns a 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, []);
            });
        });

        context('given there are folders in the database', () => {
            const testFolders = makeFoldersArray();

            beforeEach('insert folder', () => {
                return db.into('folders')
                    .insert(testFolders);
            });

            it('returns with a 200 and the array of folder', () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, testFolders);
            });
        });
    });

    describe('GET /api/folders/:folder_id', () => {
        context('given no folder in the database', () => {
            it('retuns a 404 and an error for the folder', () => {
                const testId = 2000;

                return supertest(app)
                    .get(`/api/folders/${testId}`)
                    .expect(404)
                    .expect({
                        error: { message: 'Folder does not exist' }
                    });
            });
        });

        context('given the folder is in the database', () => {
            const testFolder = makeFoldersArray();

            beforeEach('insert folder', () => {
                return db.into('folders')
                    .insert(testFolder);
            });

            it('returns a 200 and the expected folder', () => {
                const testId = 2;
                const expectedFolder = testFolder[testId - 1];

                return supertest(app)
                    .get(`/api/folders/${testId}`)
                    .expect(200, expectedFolder);
            });
        });
    });

    describe('POST /api/folders', () => {
        it('creates folder responding with a 201 and the new folder', () => {
            const newFolder = { name: 'New Folder' };

            return supertest(app)
                .post('/api/folders')
                .send(newFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newFolder.name);
                    expect(res.body).to.have.property('id');
                })
                .then(postRes => {
                    return supertest(app)
                        .get(`/api/folders/${postRes.body.id}`)
                        .expect(postRes.body);
                });
        });

        it('rejectes folder with no name, sending a 400 and error', () => {
            const emptyFolder = { name: '' };

            return supertest(app)
                .post('/api/folders')
                .send(emptyFolder)
                .expect(400)
                .expect({
                    error: { message: `Missing folder name` }
                });
        });
    });

    describe('DELETE /api/folders/:id', () => {
        context('given no folder in the database', () => {
            it('retuns a 404 and an error for the folder', () => {
                const testId = 2000;

                return supertest(app)
                    .delete(`/api/folders/${testId}`)
                    .expect(404)
                    .expect({
                        error: { message: 'Folder does not exist' }
                    });
            });
        });

        context('given folder in the database', () => {
            const testFolder = makeFoldersArray();

            beforeEach('Add folder to the database', () => {
                return db.into('folders')
                    .insert(testFolder);
            });

            it('deletes the folder and returns a 204', () => {
                const testId = 2;
                const expectedFolder = testFolder.filter(folder => folder.id != testId);

                return supertest(app)
                    .delete(`/api/folders/${testId}`)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get('/api/folders')
                            .expect(expectedFolder)
                    );
            });
        });
    });

    describe('PATCH api/folders/:id', () => {
        context('when there are no items in the database', () => {
            it('retuns a 404 and an error for the folder', () => {
                const testId = 2000;

                return supertest(app)
                    .patch(`/api/folders/${testId}`)
                    .expect(404)
                    .expect({
                        error: { message: 'Folder does not exist' }
                    });
            });
        });

        context('When items are in the database', () => {
            const testFolder = makeFoldersArray();
            beforeEach('Add folder to database', () => {
                return db.into('folders')
                    .insert(testFolder);
            });

            it('updates the folder name with a 204', () => {
                const idToUpdate = 2;
                const updateFolder = {
                    name: 'New Folder Name'
                };
                const expectedFolder = {
                    ...testFolder[idToUpdate - 1],
                    ...updateFolder
                };

                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send(updateFolder)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/folders/${idToUpdate}`)
                            .expect(expectedFolder)
                    )
            });

            it('returns a 400 and error when there is nothing to update', () => {
                const idToUpdate = 2;
                const updateFolder = {
                    name: ''
                };
                const expectedFolder = {
                    ...testFolder[idToUpdate - 1],
                    ...updateFolder
                };

                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send(updateFolder)
                    .expect(400)
                    .expect({
                        error: {
                            message: 'Request body must contain a valid name'
                        }
                    })
            })
        })
    })
})