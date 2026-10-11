import {Component} from 'react';
// Keeps one broken page (e.g. a WebGL failure) from blanking the whole app. Classroom data lives on the server, so retrying is safe.
export default class ErrorBoundary extends Component{
 state={error:null};
 static getDerivedStateFromError(error){return{error}}
 // Re-raise after the fallback renders so the error still reaches window.onerror (and the integration checks' pageerror).
 componentDidCatch(error,info){console.error('畫面錯誤',error,info?.componentStack);setTimeout(()=>{throw error})}
 render(){
  if(!this.state.error)return this.props.children;
  return <div className="panel error-boundary" role="alert"><h2>這個畫面暫時無法顯示</h2><p>已保存的資料不受影響。可以先重試；若一直出現，請重新載入頁面，或換到其他頁面繼續上課。</p><div className="button-row"><button className="primary" onClick={()=>this.setState({error:null})}>重試</button><button onClick={()=>location.reload()}>重新載入頁面</button></div></div>;
 }
}
