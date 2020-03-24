require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const errorHandler = require('./middleware/error-handler')
const TodoService = require('./todo/todo-service')
const xss = require('xss')
const jsonParser = express.json()
const path = require('path')

const app = express()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption, {
  skip: () => NODE_ENV === 'test',
}))
app.use(cors())
app.use(helmet())

app.use(express.static('public'))

const serializeTodo = todo => ({
  id: todo.id,
  title: xss(todo.title),
  completed: todo.completed
})

app
  .route('/v1/todos')



  /********************************************************************************************************** */
  //console.log(req.body)
  
  .get((req, res, next) => {
    TodoService.getTodos(req.app.get('db'))
      .then(todos => {
        res.json(todos.map(serializeTodo))
      })
  })



  /*********************************************************************************************************** */
  .post(jsonParser, (req, res, next) => {

    //console.log(req.body)

    if (!req.body.title) {
      return res.status(400).json({
        error: { message: 'bad data' }
      })
    }

    TodoService.insertTodo(
      req.app.get('db'),
      req.body)
      .then(todo => {
        res
          .status(201)
          .location(req.originalUrl + "/" + todo.id)
          .json(serializeTodo(todo))
      })
  })


app
  .route('/v1/todos/:todo_id')

  /************************************************************************************************************* */
  .all((req, res, next) => {
    if (!parseInt(req.params.todo_id)) {
      return res.status(404).json({
        error: { message: 'bad id' }
      })
    }
    TodoService.getTodoById(
      req.app.get('db'),
      req.params.todo_id
    )
      .then(todo => {
        if (!todo) {
          return res.status(404).json({
            error: { message: 'not found' }
          })
        }
        res.todo = todo
        next()
      })
  })
  .get((req, res, next) => {
    res.json(serializeTodo(res.todo))
  })




  /********************************************************************************************************* */
  .delete((req, res, next) => {
    TodoService.deleteTodo(
      req.app.get('db'),
      req.params.todo_id
    )
      .then(rows => {
        res.status(204).end()
      })
  })




  /******************************************************************************************************** */
  .patch(jsonParser, (req, res, next) => {

    if (!req.body.title)
      return res.status(400).json({
        error: {
          message: 'missing title or complete'
        }
      })

    TodoService.updateTodo(
      req.app.get('db'),
      req.params.todo_id,
      req.body
    )
      .then(todo => {
        res.status(200).json(serializeTodo(todo[0]))
      })
  })

app.use(errorHandler)

module.exports = app