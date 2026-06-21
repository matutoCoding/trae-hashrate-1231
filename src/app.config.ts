export default defineAppConfig({
  pages: [
    'pages/folders/index',
    'pages/tasks/index',
    'pages/records/index',
    'pages/mine/index',
    'pages/folder-detail/index',
    'pages/permission-action/index',
    'pages/add-authorization/index',
    'pages/feedback-detail/index',
    'pages/folder-healthcheck/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '权限巡查助手',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F8FAFC'
  },
  tabBar: {
    color: '#94A3B8',
    selectedColor: '#2563EB',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/folders/index',
        text: '文件夹'
      },
      {
        pagePath: 'pages/tasks/index',
        text: '待办'
      },
      {
        pagePath: 'pages/records/index',
        text: '记录'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
