#!/bin/bash

PROJECT_ROOT="./";
ACTIVATE_ENV=".venv/bin/activate";
SESSION="V0X";

tmux kill-session -t $SESSION 2>/dev/null
tmux new-session -d -s $SESSION

# Angular FrontEnd
tmux send-keys -t $SESSION "cd $PROJECT_ROOT/client/chat-app " C-m
tmux send-keys -t $SESSION "npm start" C-m

# Backend Django + Daphne Or Uvicorn
tmux split-window -h -t $SESSION
tmux send-keys -t $SESSION "source $ACTIVATE_ENV && cd server" C-m
#tmux send-keys -t $SESSION "daphne -b 0.0.0.0 -p 8000 V0X.asgi:application" C-m
tmux send-keys -t $SESSION "uvicorn V0X.asgi:application --host 0.0.0.0 --port 8000" C-m


# Django Admin server
tmux split-window -v -t $SESSION
tmux send-keys -t $SESSION "source $ACTIVATE_ENV && cd server" C-m
tmux send-keys -t $SESSION "python3 manage.py runserver 0.0.0.0:4000" C-m

# Claude Session
tmux new-window -d -t $SESSION -n claude
tmux send-keys -t "$SESSION:claude" "claude" C-m

#Codex Session
tmux new-window -d -t $SESSION -n codex
tmux send-keys -t "$SESSION:codex" "codex" C-m

#Console
tmux new-window -d -t $SESSION -n features

tmux attach-session -t $SESSION
