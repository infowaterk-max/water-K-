import './builder-isolation.css';
import {VisualBuilderRouteController} from './visual-builder-route-controller';

export default function VisualBuilderLayout({children}:{children:React.ReactNode}){
  return <VisualBuilderRouteController>{children}</VisualBuilderRouteController>;
}
