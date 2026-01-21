# README

## Server

```shell
endpoints:

# Signup single user
curl -X POST http://localhost:8000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"first_name":"", 
  "last_name":"", 
  "username": "" ,
  "email":"",
  "password":"", 
  "passwordTwo": "
"}' | jq


# Signup single user with image profile

curl -X POST http://localhost:8000/api/v1/signup \
  -F "first_name= " \
  -F "last_name= " \
  -F "username= " \
  -F "email= @admin.com" \
  -F "password= " \
  -F "passwordTwo= " \
  -F "image= @image.jpeg"

# Login

curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"","password":""}' | jq

----

TOKEN=$(curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"test12345"}' \
  | jq -r '.access')


curl -X GET http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" | jq

# Listing Users

curl -X GET http://localhost:8000/api/v1/users -H "Authorization: Bearer <API_KEY>"| jq

# Listing Chats Rooms of autenticated users

curl -X GET http://localhost:8000/api/v1/user/chats \
  -H "Authorization: Bearer $TOKEN"



```