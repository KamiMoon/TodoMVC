/*

[MIT licensed](http://en.wikipedia.org/wiki/MIT_License)
(c) [Sindre Sorhus](http://sindresorhus.com)

Refactored by Eric Kizaki


 */
jQuery(function($) {
    "use strict";

    //concerns:  random utilities useful outside of the scope of this application
    var Utils = {
        keys: {
            ENTER_KEY: 13
        }, 
        // https://gist.github.com/1308368
        uuid : function(a, b) {
            for (b = a = ''; a++ < 36; b += a * 51 & 52 ? (a ^ 15 ? 8
                    ^ Math.random() * (a ^ 20 ? 16 : 4) : 4).toString(16) : '-')
                ;
            return b;
        },
        pluralize : function(count, word) {
            return count === 1 ? word : word + 's';
        } 
    };

    //concerns:  data structure and CRUD operations on the data
    //goals:  no knowledge of view or events - just the Model
    var TodoList = {
        //why doesn't this work?    
        //todos : this.store()
        todos : [],  //an [] of {title: "whatever", id: "asdfniw", done: false}
        init:  function(){
            this.todos = this.store();
        },
        store : function(data) {
            if (arguments.length) {
                return amplify.store('todo-jquery', data);
            } else {
                return amplify.store('todo-jquery') || [];
            }
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
        getTodoById:  function(id){
            for (var i = 0; i < this.todos.length; i++) {
                if(this.todos[i].id === id){
                    return this.todos[i];
                }
            }
        },
        addTodo:  function(todo){
            this.todos.push({
                title : todo.title,
                id : todo.id,
                done : todo.done
            });
        },
        removeDone:  function(){
            var l = this.todos.length;
            while (l--) {
                if (this.todos[l].done) {
                    this.todos.splice(l, 1);
                }
            }
        },
        removeTodoById:  function(id){
            var indexToDelete = null;
            for (var i = 0; i < this.todos.length; i++) {
                if(this.todos[i].id === id){
                    indexToDelete = i;
                }
            }
            
            if(indexToDelete !== null){
                this.todos.splice(indexToDelete, 1);
            }
        },
        setAllDone:  function(isDone){
            $.each(this.todos, function(i, val) {
                val.done = isDone;
            });
        },
        toggleTodoDone:  function(id){
            var todo = this.getTodoById(id);
            todo.done = !todo.done;
        },
        setTitle:  function(id, newTitle){
            var todo = this.getTodoById(id);
            todo.title = newTitle;
        }
    };

    //concerns:  all jQuery and references to the DOM are here
    var TodoView = {
        todoTemplate : Handlebars.compile($('#todo-template').html()),
        $applicationPanel : $('#todoapp'),
        $todoText : $('#todo-text'),
        $todoPanel : $('#main'),
        $todoToggleCheckBox : $('#toggleCheckbox'),
        //why doesn't this work?
        //$footer : this.$applicationPanel.find('footer'),
        $footer : $('#todoapp').find('footer'),
        $clearBtn : $('#clear-completed'),
        $countLabel : $('#todo-count'),
        
        todoList: {
        	$todoList : $('#todo-list'),
            getTodoId:  function(elem){
                return $(elem).closest('li').data('id');
            },
            displayEditMode:  function(elem){
                $(elem).closest('li').addClass('editing').find('.edit').focus();
            },
            getEditingText:  function(elem){
                return $(elem).removeClass('editing').val();
            },
            TOGGLE_CLASS: '.toggle',
            VIEW_CLASS: '.view',
            EDIT_CLASS:  '.edit',
            DESTROY_CLASS: '.destroy'
        },
        
        render: function(todoList){
            var todos = todoList.todos;
            this.todoList.$todoList.html(this.todoTemplate(todos));
            this.$todoPanel.toggle(!!todos.length);
            this.renderFooter(todoList);
        },
        renderFooter: function(todoList) {
            var todos = todoList.todos;
            var todoCount = todos.length, activeTodos = todoList.activeTodoCount(), completedTodos = todoCount
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

    //concerns:  handles actions on the view, binding the view with data
    //does not directly alter or reference data or DOM - delegates to todoList or todoView
    function Controller() {
        var todoList = TodoList;
        var todoView = TodoView;

        initialize();
        
        function initialize(){
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
        
        function bindAddNewTodo(){
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
                    id : Utils.uuid(),
                    done : false
                });
                refreshView();
            });
        }
        
        function bindToggleAll(){
        	todoView.$todoToggleCheckBox.on('change', function() {
                todoList.setAllDone(!!$(this).attr('checked'));
                refreshView();
            });
        }
        
        function bindTodoList(){
        	todoView.todoList.$todoList.on('change', todoView.todoList.TOGGLE_CLASS, function() {
                todoList.toggleTodoDone(todoView.todoList.getTodoId(this));
                refreshView();
            }).on('dblclick', todoView.todoList.VIEW_CLASS, function() {
                todoView.todoList.displayEditMode(this);
            }).on('keypress', todoView.todoList.EDIT_CLASS, function(e) {
                if (e.keyCode === Utils.keys.ENTER_KEY) {
                    e.target.blur();
                }
            }).on('blur', todoView.todoList.EDIT_CLASS, function() {
                todoList.setTitle(todoView.todoList.getTodoId(this), todoView.todoList.getEditingText(this));
                refreshView();
            }).on('click', todoView.todoList.DESTROY_CLASS, function() {
                todoList.removeTodoById(todoView.todoList.getTodoId(this));
                refreshView();
            });
        }
        
        function bindRemoveDone(){
        	todoView.$clearBtn.on('click', function() {
                todoList.removeDone();
                refreshView();
            });
        }
        
        function refreshView(){
            todoView.render(todoList);
            todoList.store(todoList.todos);
        }
    };
    window.TodoApp = Controller();
});