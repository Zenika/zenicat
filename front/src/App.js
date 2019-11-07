import React, { useEffect, useReducer, useState, useCallback } from 'react';
import openSocket from 'socket.io-client';
import './App.css';
import { Button, Input } from "antd";

function messageReducer(state, action) {
  switch (action.type) {
    case "MESSAGE_RECIEVED" : {
      return [...state, {text : action.message}];
    }
    case "MESSAGE_SENT": {
      return [...state, {text : action.message, from: 'me'}];
    }
    case "STORAGE_MESSAGE": {
      return action.messages;
    }
    default : {
      return state;
    }
  }
}

function App() {
  const [messages, dispatch] = useReducer(messageReducer, []);

  const [thread, setThread] = useState(localStorage.slack || '')

  const [input, setInput] = useState('');
  // const [inputLastName, setInputLastName] = useState('');
  const [inputFirstName, setInputFirstName] = useState('');
  // const [inputEMail, setInputEMail] = useState('');
  // const [inputPhone, setInputPhone] = useState('');

  const { TextArea } = Input;

  // Socket
  useEffect(() => {
    if(!thread) return

    const socket = openSocket(`localhost:3000`, { query: { thread } });

    socket.on('message', (message) => {
      dispatch({type: "MESSAGE_RECIEVED", message: message.text });
    })
  }, [thread]);

  const messagesFromSlack = useCallback(async () => {
    const mSlack = await fetch(`/message?thread=${thread}`)
    dispatch({type: "STORAGE_MESSAGE", messages: (await mSlack.json()).messages });
  }, [dispatch, thread])

  useEffect(() => {
    if (!localStorage.slack) localStorage.slack = thread 
    else {
      messagesFromSlack()
    }
  }, [messagesFromSlack, thread])

  return (
    <div className="App">
        {thread ? '' : (
          <div className='formulaire'>
            <div className='input-bloc'>
              <p className='label'>Prénom</p>
              <input placeholder='Dupont' value={inputFirstName} onChange={(event) => setInputFirstName(event.target.value)}/>
            </div>
            {/* <div className='input-bloc'>
              <p className='label'>Nom</p>
              <input placeholder='Marc' value={inputLastName} onChange={(event) => setInputLastName(event.target.value)}/>
            </div>
            <div className='input-bloc'>
              <p className='label'>Prénom</p>
              <input placeholder='Dupont' value={inputFirstName} onChange={(event) => setInputFirstName(event.target.value)}/>
            </div>
            <div className='input-bloc'>
              <p className='label'>Mail</p>
              <input placeholder='mon.mail@exemple.com' value={inputEMail} onChange={(event) => setInputEMail(event.target.value)} type="email"/>
            </div>
            <div className='input-bloc'>
              <p className='label'>Téléphone</p>
              <input placeholder='0612345678' value={inputPhone} onChange={(event) => setInputPhone(event.target.value)} type="tel"/>
            </div> */}
          </div>
          )}

        <div className="container">
          {messages.map(message =>
            <div className={message.from==='me' ? 'content-right' : 'content-left'}>
              <p key={message.text} className={message.from==='me' ? 'right' : ''}>{message.text}</p>
            </div>
          )}
        </div>

        <div className='input-bloc-message'>
          <TextArea placeholder='Votre message...' value={input} onChange={(event) => setInput(event.target.value)} autosize/>
          <Button type="primary" onClick={async () => {
            dispatch({type: "MESSAGE_SENT", message: input });
            setInput('');
            const response = await fetch(`/question?text=${input}${(localStorage.slack || thread) ? `&thread_ts=${localStorage.slack || thread}` : ''}&username=${inputFirstName}&uuid=${localStorage.uuid}`)
            if(!thread) {
              const { result } = await response.json()
              setThread(result.message.ts)
            }
          }}>
            Envoyer
          </Button>
        </div>
    </div>
  );
}

export default App;
