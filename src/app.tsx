import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import { AppProvider } from '@/store/AppContext';
import './app.scss';

function App(props) {
  useEffect(() => {});

  useDidShow(() => {});
  useDidHide(() => {});

  return <AppProvider>{props.children}</AppProvider>;
}

export default App;
