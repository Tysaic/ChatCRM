#!/bin/bash

PROJECT_ROOT="./";
ACTIVATE_ENV=".venv/bin/activate";
SESSION="V0X";


tmux new-session -d -s $SESSION

tmux send-keys -t $SESSION "cd $PROJECT_ROOT/client/chat-app && npm start" C-m

tmux split-window -h -t $SESSION
tmux send-keys -t $SESSION "source $ACTIVATE_ENV && cd server && daphne -b 0.0.0.0 -p 8000 V0X.asgi:application" C-m


tmux split-window -v -t $SESSION
tmux send-keys -t $SESSION "source $ACTIVATE_ENV && cd server && python3 manage.py runserver 0.0.0.0:4000" C-m

tmux attach-session -t $SESSION
