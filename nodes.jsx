import {Handle,Position} from '@xyflow/react';
const Node=({title,sub,kind,source=true,target=true})=><div className={`flow-node ${kind}`}>{target&&<Handle type="target" position={Position.Left}/>}<b>{title}</b><small>{sub}</small>{source&&<Handle type="source" position={Position.Right}/>}</div>;
export const nodeTypes={
 sensor:({data})=><Node kind="sensor" title="Data Source" sub={data.label||'Turbine temperature'}/>,
 average:({data})=><Node kind="average" title="Moving Average" sub={`Window: ${data.window||5}`}/>,
 threshold:({data})=><Node kind="threshold" title="Threshold Rule" sub={`Value > ${data.limit??80} °C`}/>,
 sms:({data})=><Node kind="alert" title="SMS / Webhook Alert" sub={data.message||'Notify operator'} source={false}/>,
};