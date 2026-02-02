#!/bin/bash

PROJECT_ROOT="./";
ACTIVATE_ENV=".venv/bin/activate";
SESSION="V0X";


tmux new-session -d -s $SESSION

# Angular FrontEnd
tmux send-keys -t $SESSION "cd $PROJECT_ROOT/client/chat-app " C-m
tmux send-keys -t $SESSION "npm start" C-m

# Backend Django + Daphne
tmux split-window -h -t $SESSION
tmux send-keys -t $SESSION "source $ACTIVATE_ENV && cd server" C-m
tmux send-keys -t $SESSION "daphne -b 0.0.0.0 -p 8000 V0X.asgi:application" C-m

# Django Admin server
tmux split-window -v -t $SESSION
tmux send-keys -t $SESSION "source $ACTIVATE_ENV && cd server" C-m
tmux send-keys -t $SESSION "python3 manage.py runserver 0.0.0.0:4000" C-m

# Attach to session
tmux attach-session -t $SESSION
