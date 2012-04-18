/*

[MIT licensed](http://en.wikipedia.org/wiki/MIT_License)
(c) [Sindre Sorhus](http://sindresorhus.com)

Refactored by Eric Kizaki


 */

// concerns: random utilities useful outside of the scope of this
// application
var Utils = {
	keys : {
		ENTER_KEY : 13
	},
	pluralize : function(count, word) {
		return count === 1 ? word : word + 's';
	}
};

var TodoApp = (function() {

	function ToDo(title, id, done){
		this.title = title;
		this.id = id;
		this.done = done;
		
		//why doesn't this work?  Why can't I add public methods to this object?
		return {
			toggleDone: function(){
				this.done = !done;
			}
		};
	}

	// concerns: data structure and CRUD operations on the data
	// goals: no knowledge of view or events - just the Model
	var TodoList = {
		// why doesn't this work?
		// todos : this.store()
		todos : [], // an [] of {title: "whatever", id: "asdfniw", done: false}
		init : function() {
			this.todos = this.store();
		},
		toDoIdCounter : 0,
		store : function(data) {
			if (data) {
				// this gets incremented in addTodo
				amplify.store('todo-id', this.toDoIdCounter);
				return amplify.store('todo-jquery', data);
			}
			return amplify.store('todo-jquery') || [];
		},
		activeTodoCount : function() {
			var count = 0;
			$.each(this.todos, function(i, val) {
				if (!val.done) {
					count++;
				}
			});
			return count;
		},
		getTodoById : function(id) {
			for ( var i = 0; i < this.todos.length; i++) {
				if (this.todos[i].id === id) {
					return this.todos[i];
				}
			}
		},
		addTodo : function(todo) {
			this.handleIncrementingCounter();
			this.todos.push(new ToDo(todo.title, "todo-id-" + this.toDoIdCounter, todo.done));
		},
		handleIncrementingCounter : function() {
			if (this.toDoIdCounter === 0) {
				// check and see if there is already data in the database
				var existingId = amplify.store('todo-id');
				if (existingId !== undefined) {
					this.toDoIdCounter = existingId;
				}
			}
			this.toDoIdCounter++;
		},
		removeDone : function() {
			var l = this.todos.length;
			while (l--) {
				if (this.todos[l].done) {
					this.todos.splice(l, 1);
				}
			}
		},
		removeTodoById : function(id) {
			var indexToDelete = null;
			for ( var i = 0; i < this.todos.length; i++) {
				if (this.todos[i].id === id) {
					indexToDelete = i;
				}
			}

			if (indexToDelete !== null) {
				this.todos.splice(indexToDelete, 1);
			}
		},
		setAllDone : function(isDone) {
			$.each(this.todos, function(i, val) {
				val.done = isDone;
			});
		}
	};

	// concerns: all jQuery and references to the DOM are here
	var TodoView = {
		todoTemplate : Handlebars.compile($('#todo-template').html()),
		$applicationPanel : $('#todoapp'),
		$todoText : $('#todo-text'),
		$todoPanel : $('#main'),
		$todoToggleCheckBox : $('#toggleCheckbox'),
		// why doesn't this work?
		// $footer : this.$applicationPanel.find('footer'),
		$footer : $('#todoapp').find('footer'),
		$clearBtn : $('#clear-completed'),
		$countLabel : $('#todo-count'),

		todoList : {
			$todoList : $('#todo-list'),
			getTodoId : function(elem) {
				return $(elem).closest('li').data('id');
			},
			displayEditMode : function(elem) {
				$(elem).closest('li').addClass('editing').find('.edit').focus();
			},
			getEditingText : function(elem) {
				return $(elem).removeClass('editing').val();
			},
			TOGGLE_CLASS : '.toggle',
			VIEW_CLASS : '.view',
			EDIT_CLASS : '.edit',
			DESTROY_CLASS : '.destroy'
		},

		render : function(todoList) {
			var todos = todoList.todos;
			this.todoList.$todoList.html(this.todoTemplate(todos));
			this.$todoPanel.toggle(!!todos.length);
			this.renderFooter(todoList);
		},
		renderFooter : function(todoList) {
			var todos = todoList.todos;
			var todoCount = todos.length, activeTodos = todoList
					.activeTodoCount(), completedTodos = todoCount
					- activeTodos, countTitle = '<b>' + activeTodos + '</b> '
					+ Utils.pluralize(activeTodos, 'item') + ' left', clearTitle = 'Clear '
					+ completedTodos
					+ ' completed '
					+ Utils.pluralize(completedTodos, 'item');
			this.$footer.toggle(!!todoCount);
			this.$countLabel.html(countTitle);
			this.$clearBtn.text(clearTitle).toggle(!!completedTodos);
		}
	};

	// concerns: handles actions on the view, binding the view with data
	// does not directly alter or reference data or DOM - delegates to todoList
	// or todoView
	function controller() {
		var todoList = TodoList;
		var todoView = TodoView;

		initialize();

		function initialize() {
			todoList.init();
			bindEvents();
			todoView.render(todoList);
		}

		function bindEvents() {
			bindAddNewTodo();
			bindToggleAll();
			bindTodoList();
			bindRemoveDone();
		}

		function bindAddNewTodo() {
			todoView.$todoText.on('keyup', function(e) {
				if (e.which !== Utils.keys.ENTER_KEY) {
					return;
				}

				var $input = $(this), inputVal = $input.val();
				if (!inputVal) {
					return;
				}
				$input.val('');

				todoList.addTodo({
					title : inputVal,
					done : false
				});
				refreshView();
			});
		}

		function bindToggleAll() {
			todoView.$todoToggleCheckBox.on('change', function() {
				todoList.setAllDone(!!$(this).attr('checked'));
				refreshView();
			});
		}

		function bindTodoList() {
			todoView.todoList.$todoList.on('change', todoView.todoList.TOGGLE_CLASS, function() {
				var todo = todoList.getTodoById(todoView.todoList.getTodoId(this));
				todo.done = !todo.done;
				//why doesn't this work?
				//todo.toggleDone();
				refreshView();
			}).on('dblclick', todoView.todoList.VIEW_CLASS, function() {
				todoView.todoList.displayEditMode(this);
			}).on('keypress', todoView.todoList.EDIT_CLASS, function(e) {
				if (e.keyCode === Utils.keys.ENTER_KEY) {
					e.target.blur();
				}
			}).on('blur', todoView.todoList.EDIT_CLASS, function() {
				var text = todoView.todoList.getEditingText(this);
				var todo = todoList.getTodoById(todoView.todoList.getTodoId(this));
				todo.title = text;
				refreshView();
			}).on('click', todoView.todoList.DESTROY_CLASS, function() {
				todoList.removeTodoById(todoView.todoList.getTodoId(this));
				refreshView();
			});
		}

		function bindRemoveDone() {
			todoView.$clearBtn.on('click', function() {
				todoList.removeDone();
				refreshView();
			});
		}

		function refreshView() {
			todoView.render(todoList);
			todoList.store(todoList.todos);
		}
	}

	return {
		runApp : function() {
			controller();
		}
	};

}());

$(document).ready(function() {
	TodoApp.runApp();
});