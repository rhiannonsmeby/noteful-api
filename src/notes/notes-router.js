const path = require('path')
const express = require('express')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = note => ({
    id: note.id,
    name: note.name,
    content: note.content,
    date_created: note.date_created,
    folder: note.folder,
})

notesRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        NotesService.getAllNotes(knexInstance)
            .then(notes => {
                res.join(notes.map(serializeNote))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const {name, content, folder} = req.body
        const newNote = {name, content, folder}

        for (const [key, value] of Object.entries(newNote)) {
            if (value == null) {
                return res.status(404).json({
                   error: {message: `Missing '${key}' in request body`} 
                })
            }
        }
    })

    notesRouter
        .route('/:id')
        .all((req, res, next) => {
            NotesService.getById(
                req.app.get('db'),
                req.params.id
            )
                .then(note => {
                    if (!note) {
                        return res.status(404).json({
                            error: {message: `Note doesn't exist`}
                        })
                    }
                    res.note = note
                    next()
                })
                .catch(next)
        })
        .get((req, res, next) => {
            res.json({
                id: res.note.id,
                name: res.note.name,
                content: res.note.content,
                date_created: res.note.date_created,
            })
        })
        .delete((req, res, next) => {
            NotesService.deleteNote(
                req.app.get('db'),
                req.params.id
            )
                .then(() => {
                    res.status(204).end()
                })
                .catch(next)
        })
        .patch(jsonParser, (req, res, next) => {
            const {name, content} = req.body
            const noteToUpdate = {name, content}

            const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
            if (numberOfValues === 0) {
                return res.status(400).json({
                    error: {
                        message: `Request body must contain either 'title' or 'content'`
                    }
                })
            }

            NotesService.updateNote(
                req.app.get('db'),
                req.params.id,
                noteToUpdate
            )
                .then(numRowsAffected => {
                    res.status(204).end()
                })
                .catch(next)
        })
    
        module.exports = notesRouter