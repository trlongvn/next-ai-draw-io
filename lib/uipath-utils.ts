import { DOMParser, XMLSerializer } from "@xmldom/xmldom"

// Interface for intermediate graph representation
interface GraphNode {
    id: string
    value: string // Text content (label)
    type: "Start" | "End" | "Action" | "Decision" | "State" | "FinalState" | "Unknown"
    style: string
    x: number
    y: number
    width: number
    height: number
    outgoing: GraphEdge[]
}

interface GraphEdge {
    id: string
    source: string
    target: string
    label: string // Condition for decisions/transitions
    points?: { x: number; y: number }[]
}

export class UiPathGenerator {
    constructor() {}

    public generate(diagramXml: string): string {
        const nodes = this.parseDiagram(diagramXml)
        if (nodes.length === 0) return ""

        // Heuristic: Check for State shapes to decide between Flowchart and StateMachine
        const isStateMachine = nodes.some(
            (n) => n.type === "State" || n.type === "FinalState",
        )

        if (isStateMachine) {
            return this.generateStateMachine(nodes)
        } else {
            return this.generateFlowchart(nodes)
        }
    }

    // --- Parsing Logic ---

    private parseDiagram(xml: string): GraphNode[] {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xml, "text/xml")
        const cells = Array.from(xmlDoc.getElementsByTagName("mxCell"))
        
        const nodes: Map<string, GraphNode> = new Map()
        const edges: GraphEdge[] = []

        cells.forEach((cell) => {
            const id = cell.getAttribute("id") || ""
            const value = cell.getAttribute("value") || ""
            const style = cell.getAttribute("style") || ""
            const parent = cell.getAttribute("parent")
            const vertex = cell.getAttribute("vertex") === "1"
            const edge = cell.getAttribute("edge") === "1"

            if (vertex && parent !== "0" && parent !== null) { // Skip root and layer
                const geom = cell.getElementsByTagName("mxGeometry")[0]
                const x = parseFloat(geom?.getAttribute("x") || "0")
                const y = parseFloat(geom?.getAttribute("y") || "0")
                const width = parseFloat(geom?.getAttribute("width") || "0")
                const height = parseFloat(geom?.getAttribute("height") || "0")

                const type = this.classifyNode(style, value)

                nodes.set(id, {
                    id,
                    value: this.cleanLabel(value),
                    type,
                    style,
                    x,
                    y,
                    width,
                    height,
                    outgoing: [],
                })
            } else if (edge) {
                const source = cell.getAttribute("source")
                const target = cell.getAttribute("target")
                if (source && target) {
                    edges.push({
                        id,
                        source,
                        target,
                        label: this.cleanLabel(value),
                    })
                }
            }
        })

        // Link edges to nodes
        edges.forEach((edge) => {
            const sourceNode = nodes.get(edge.source)
            if (sourceNode) {
                sourceNode.outgoing.push(edge)
            }
        })

        return Array.from(nodes.values())
    }

    private classifyNode(style: string, value: string): GraphNode["type"] {
        const s = style.toLowerCase()
        if (s.includes("doubleellipse") || s.includes("end")) return "FinalState" // Checked before "Start" because "endState" might contain "start"? No, but safe. Wait, "endState" contains "state". "ellipse"
        // Actually "ellipse" is the conflict. "FinalState" (endState) uses "ellipse" style often in draw.io or similar shapes.
        // My template uses: style="ellipse;...shape=endState;..."
        // So "ellipse" is present.
        
        if (s.includes("ellipse") || s.includes("start")) return "Start"
        if (s.includes("rhombus")) return "Decision"
        if (s.includes("rounded=1")) return "State"
        if (s.includes("rounded=0") || !s.includes("rounded")) return "Action" // Default rect
        return "Unknown"
    }

    private cleanLabel(value: string): string {
        return value.replace(/<[^>]+>/g, "").trim()
    }

    // --- Activity Generation Logic ---

    private mapNodeToActivity(node: GraphNode): string {
        const lowerVal = node.value.toLowerCase()
        const label = node.value || "Sequence"

        // 1. Log Message
        if (lowerVal.startsWith("log") || lowerVal.startsWith("write line")) {
             // Extract message, simple heuristic
             return `<ui:LogMessage DisplayName="${label}" Level="Info" Message="[&quot;${label}&quot;]" sap2010:WorkflowViewState.IdRef="LogMessage_${node.id}" />`
        }

        // 2. Assign (Format: var = value)
        if (lowerVal.includes("=")) {
            const parts = node.value.split("=")
            if (parts.length === 2) {
                const to = parts[0].trim()
                const val = parts[1].trim()
                 return `<Assign DisplayName="${label}" sap2010:WorkflowViewState.IdRef="Assign_${node.id}">
                    <Assign.To>
                        <OutArgument x:TypeArguments="x:String">[${to}]</OutArgument>
                    </Assign.To>
                    <Assign.Value>
                        <InArgument x:TypeArguments="x:String">[${val}]</InArgument>
                    </Assign.Value>
                </Assign>`
            }
        }

        // 3. Invoke Workflow
        if (lowerVal.startsWith("invoke")) {
             const workflowName = node.value.replace(/^invoke\s+/i, "").trim()
             return `<ui:InvokeWorkflowFile ArgumentsVariable="{x:Null}" ContinueOnError="{x:Null}" DisplayName="${label}" LogEntry="No" LogExit="No" UnSafe="False" WorkflowFileName="${workflowName}.xaml" sap2010:WorkflowViewState.IdRef="InvokeWorkflow_${node.id}">
                <ui:InvokeWorkflowFile.Arguments>
                    <scg:Dictionary x:TypeArguments="x:String, Argument" />
                </ui:InvokeWorkflowFile.Arguments>
             </ui:InvokeWorkflowFile>`
        }

        // Default: Sequence
        return `<Sequence DisplayName="${label}" sap2010:WorkflowViewState.IdRef="Sequence_${node.id}">
                <ui:Comment Out="Write logic here" />
           </Sequence>`
    }

    // --- Generation Logic (Flowchart) ---

    private generateFlowchart(nodes: GraphNode[]): string {
        const startNode = nodes.find((n) => n.type === "Start")
        if (!startNode) return this.wrapXaml("<!-- Error: No Start Node found -->")

        // Basic implementation: Flat flowchart with FlowSteps
        
        let xamlContent = `<Flowchart DisplayName="Flowchart Process" sap2010:WorkflowViewState.IdRef="Flowchart_1">
            <sap:WorkflowViewStateService.ViewState>
                <scg:Dictionary x:TypeArguments="x:String, x:Object">
                    <x:Boolean x:Key="IsExpanded">True</x:Boolean>
                    <av:Point x:Key="ShapeLocation">${startNode.x},${startNode.y}</av:Point>
                    <av:Size x:Key="ShapeSize">${startNode.width},${startNode.height}</av:Size>
                </scg:Dictionary>
            </sap:WorkflowViewStateService.ViewState>
            <Flowchart.StartNode>
                ${this.generateFlowElement(startNode, nodes)}
            </Flowchart.StartNode>
            <!-- Other nodes are implicitly connected via StartNode tree, but orphan nodes might use x:Reference -->
            <!-- For standard XAML, we usually nests FlowSteps. -->
        </Flowchart>`

        return this.wrapXaml(xamlContent)
    }

    private generateFlowElement(node: GraphNode, allNodes: GraphNode[], visited: Set<string> = new Set()): string {
         if (visited.has(node.id)) {
            // Cycle detected or merge point -> use x:Reference if supported or just stop
            return `<x:Reference>__ReferenceID${node.id}</x:Reference>` // Simplified
        }
        visited.add(node.id)

        // Special handling for Start Node wrapper
        // Must be handled BEFORE generating FlowStep content to avoid double recursion
        if (node.type === "Start") {
             const nextEdge = node.outgoing[0]
             const nextNode = nextEdge ? allNodes.find(n => n.id === nextEdge.target) : null
             // Start node itself doesn't generate a FlowStep, just points to next
             if (nextNode) return this.generateFlowElement(nextNode, allNodes, visited)
             return ""
        }

        // Find primary outgoing connection
        // For Decision: True/False logic needed
        // For Sequence: Single outgoing

        if (node.type === "Decision") {
            const trueEdge = node.outgoing.find(e => e.label.toLowerCase() === "true" || e.label.toLowerCase() === "yes")
            const falseEdge = node.outgoing.find(e => e.label.toLowerCase() === "false" || e.label.toLowerCase() === "no")

            const nextTrue = trueEdge ? allNodes.find(n => n.id === trueEdge.target) : null
            const nextFalse = falseEdge ? allNodes.find(n => n.id === falseEdge.target) : null

            return `<FlowDecision x:Name="__ReferenceID${node.id}" DisplayName="${node.value || 'Decision'}" sap2010:WorkflowViewState.IdRef="FlowDecision_${node.id}">
                <sap:WorkflowViewStateService.ViewState>
                     <scg:Dictionary x:TypeArguments="x:String, x:Object">
                        <av:Point x:Key="ShapeLocation">${node.x},${node.y}</av:Point>
                        <av:Size x:Key="ShapeSize">${node.width},${node.height}</av:Size>
                    </scg:Dictionary>
                </sap:WorkflowViewStateService.ViewState>
                <FlowDecision.True>
                    ${nextTrue ? this.generateFlowElement(nextTrue, allNodes, visited) : ''}
                </FlowDecision.True>
                <FlowDecision.False>
                    ${nextFalse ? this.generateFlowElement(nextFalse, allNodes, visited) : ''}
                </FlowDecision.False>
            </FlowDecision>`
        } 
        
        // Sequence / Action
        const nextEdge = node.outgoing[0]
        const nextNode = nextEdge ? allNodes.find(n => n.id === nextEdge.target) : null

        return `<FlowStep x:Name="__ReferenceID${node.id}" sap2010:WorkflowViewState.IdRef="FlowStep_${node.id}">
             <sap:WorkflowViewStateService.ViewState>
                <scg:Dictionary x:TypeArguments="x:String, x:Object">
                    <av:Point x:Key="ShapeLocation">${node.x},${node.y}</av:Point>
                    <av:Size x:Key="ShapeSize">${node.width},${node.height}</av:Size>
                </scg:Dictionary>
            </sap:WorkflowViewStateService.ViewState>
            ${this.mapNodeToActivity(node)}
            <FlowStep.Next>
                ${nextNode ? this.generateFlowElement(nextNode, allNodes, visited) : ''}
            </FlowStep.Next>
        </FlowStep>`
    }


    // --- Generation Logic (StateMachine) ---

    private generateStateMachine(nodes: GraphNode[]): string {
         const startNode = nodes.find((n) => n.type === "Start")
         if (!startNode) return this.wrapXaml("<!-- Error: No Start Node found for State Machine -->")
        
         // State Machine logic is flatter: States are listed, Transitions link them
         
         const states = nodes.filter(n => n.type === "State" || n.type === "FinalState")
         
         let statesXml = ""
         states.forEach(state => {
             if (state.type === "FinalState") {
                 statesXml += `<StateMachine.State>
                    <State x:Name="__ReferenceID${state.id}" DisplayName="${state.value || 'Final State'}" IsFinal="True" sap2010:WorkflowViewState.IdRef="State_${state.id}">
                        <sap:WorkflowViewStateService.ViewState>
                             <scg:Dictionary x:TypeArguments="x:String, x:Object">
                                <av:Point x:Key="ShapeLocation">${state.x},${state.y}</av:Point>
                                <av:Size x:Key="ShapeSize">${state.width},${state.height}</av:Size>
                            </scg:Dictionary>
                        </sap:WorkflowViewStateService.ViewState>
                        <State.Entry>
                             ${this.mapNodeToActivity(state)}
                        </State.Entry>
                    </State>
                 </StateMachine.State>`
             } else {
                 const transitions = state.outgoing.map(edge => {
                     const target = nodes.find(n => n.id === edge.target)
                     if (!target) return ""
                     return `<Transition DisplayName="${edge.label || 'Transition'}" sap2010:WorkflowViewState.IdRef="Transition_${edge.id}">
                        <Transition.Trigger>
                             <ui:Comment Out="Trigger Logic" />
                        </Transition.Trigger>
                        <Transition.To>
                            <x:Reference>__ReferenceID${target.id}</x:Reference>
                        </Transition.To>
                     </Transition>`
                 }).join("\n")

                 statesXml += `<StateMachine.State>
                    <State x:Name="__ReferenceID${state.id}" DisplayName="${state.value || 'State'}" sap2010:WorkflowViewState.IdRef="State_${state.id}">
                        <sap:WorkflowViewStateService.ViewState>
                             <scg:Dictionary x:TypeArguments="x:String, x:Object">
                                <av:Point x:Key="ShapeLocation">${state.x},${state.y}</av:Point>
                                <av:Size x:Key="ShapeSize">${state.width},${state.height}</av:Size>
                            </scg:Dictionary>
                        </sap:WorkflowViewStateService.ViewState>
                        <State.Entry>
                             ${this.mapNodeToActivity(state)}
                        </State.Entry>
                        <State.Transitions>
                            ${transitions}
                        </State.Transitions>
                    </State>
                 </StateMachine.State>`
             }
         })

         const initialEdge = startNode.outgoing[0]
         const initialTarget = initialEdge ? nodes.find(n => n.id === initialEdge.target) : null

         const xamlContent = `<StateMachine DisplayName="State Machine" sap2010:WorkflowViewState.IdRef="StateMachine_1">
             <sap:WorkflowViewStateService.ViewState>
                <scg:Dictionary x:TypeArguments="x:String, x:Object">
                    <x:Boolean x:Key="IsExpanded">True</x:Boolean>
                    <av:Point x:Key="ShapeLocation">${startNode.x},${startNode.y}</av:Point>
                    <x:Double x:Key="StateContainerWidth">600</x:Double>
                    <x:Double x:Key="StateContainerHeight">600</x:Double>
                    <av:Point x:Key="ShapeSize">${startNode.width},${startNode.height}</av:Point>
                </scg:Dictionary>
            </sap:WorkflowViewStateService.ViewState>
            <StateMachine.InitialState>
                 ${initialTarget ? `<x:Reference>__ReferenceID${initialTarget.id}</x:Reference>` : ''}
            </StateMachine.InitialState>
            ${statesXml}
         </StateMachine>`

        return this.wrapXaml(xamlContent)
    }

    private wrapXaml(content: string): string {
        return `<Activity mc:Ignorable="sap sap2010" x:Class="Main" mva:VisualBasic.Settings="{x:Null}" sap:VirtualizedContainerService.HintSize="800,800" sap2010:WorkflowViewState.IdRef="ActivityBuilder_1" xmlns="http://schemas.microsoft.com/netfx/2009/xaml/activities" xmlns:av="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mva="clr-namespace:Microsoft.VisualBasic.Activities;assembly=System.Activities" xmlns:sap="http://schemas.microsoft.com/netfx/2009/xaml/activities/presentation" xmlns:sap2010="http://schemas.microsoft.com/netfx/2010/xaml/activities/presentation" xmlns:scg="clr-namespace:System.Collections.Generic;assembly=mscorlib" xmlns:sco="clr-namespace:System.Collections.ObjectModel;assembly=mscorlib" xmlns:ui="http://schemas.uipath.com/workflow/activities" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
  <TextExpression.NamespacesForImplementation>
    <sco:Collection x:TypeArguments="x:String">
      <x:String>System.Activities</x:String>
      <x:String>System.Activities.Statements</x:String>
      <x:String>System.Activities.Expressions</x:String>
      <x:String>System.Activities.Validation</x:String>
      <x:String>System.Activities.XamlIntegration</x:String>
      <x:String>Microsoft.VisualBasic</x:String>
      <x:String>Microsoft.VisualBasic.Activities</x:String>
      <x:String>System</x:String>
      <x:String>System.Collections</x:String>
      <x:String>System.Collections.Generic</x:String>
      <x:String>System.Data</x:String>
      <x:String>System.Diagnostics</x:String>
      <x:String>System.Drawing</x:String>
      <x:String>System.IO</x:String>
      <x:String>System.Linq</x:String>
      <x:String>System.Net.Mail</x:String>
      <x:String>System.Xml</x:String>
      <x:String>System.Xml.Linq</x:String>
      <x:String>UiPath.Core</x:String>
      <x:String>UiPath.Core.Activities</x:String>
      <x:String>System.Windows.Markup</x:String>
    </sco:Collection>
  </TextExpression.NamespacesForImplementation>
  <TextExpression.ReferencesForImplementation>
    <sco:Collection x:TypeArguments="AssemblyReference">
      <AssemblyReference>System.Activities</AssemblyReference>
      <AssemblyReference>Microsoft.VisualBasic</AssemblyReference>
      <AssemblyReference>mscorlib</AssemblyReference>
      <AssemblyReference>System.Data</AssemblyReference>
      <AssemblyReference>System</AssemblyReference>
      <AssemblyReference>System.Drawing</AssemblyReference>
      <AssemblyReference>System.Core</AssemblyReference>
      <AssemblyReference>System.Xml</AssemblyReference>
      <AssemblyReference>System.Xml.Linq</AssemblyReference>
      <AssemblyReference>PresentationFramework</AssemblyReference>
      <AssemblyReference>WindowsBase</AssemblyReference>
      <AssemblyReference>PresentationCore</AssemblyReference>
      <AssemblyReference>System.Xaml</AssemblyReference>
      <AssemblyReference>UiPath.System.Activities</AssemblyReference>
      <AssemblyReference>UiPath.UiAutomation.Activities</AssemblyReference>
    </sco:Collection>
  </TextExpression.ReferencesForImplementation>
  ${content}
</Activity>`
    }
    
    // --- ReFramework Template ---
    
    public getReFrameworkTemplate(): string {
        // XML encoded string for a basic Draw.io diagram representing ReFramework State Machine
        // This is a minimal valid draw.io XML that the editor can load
        return `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="start" value="" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;" vertex="1" parent="1"><mxGeometry x="380" y="40" width="40" height="40" as="geometry"/></mxCell>
<mxCell id="init" value="Initialization" style="rounded=1;whiteSpace=wrap;html=1;arcSize=40;fontStyle=0" vertex="1" parent="1"><mxGeometry x="280" y="150" width="240" height="80" as="geometry"/></mxCell>
<mxCell id="get_data" value="Get Transaction Data" style="rounded=1;whiteSpace=wrap;html=1;arcSize=40;fontStyle=0" vertex="1" parent="1"><mxGeometry x="280" y="300" width="240" height="80" as="geometry"/></mxCell>
<mxCell id="process" value="Process Transaction" style="rounded=1;whiteSpace=wrap;html=1;arcSize=40;fontStyle=0" vertex="1" parent="1"><mxGeometry x="280" y="460" width="240" height="80" as="geometry"/></mxCell>
<mxCell id="end" value="End Process" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;strokeWidth=2;shape=endState;fillColor=#000000;strokeColor=#ff0000" vertex="1" parent="1"><mxGeometry x="360" y="650" width="80" height="80" as="geometry"/></mxCell>
<mxCell id="trans_1" value="System Error" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="init" target="end"><mxGeometry relative="1" as="geometry"><Array as="points"><Point x="100" y="190"/><Point x="100" y="690"/></Array></mxGeometry></mxCell>
<mxCell id="trans_2" value="Success" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="init" target="get_data"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="trans_3" value="New Transaction" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="get_data" target="process"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="trans_4" value="No Data" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="get_data" target="end"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="trans_5" value="Success / Business Rule Ex" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="process" target="get_data"><mxGeometry relative="1" as="geometry"><Array as="points"><Point x="640" y="500"/><Point x="640" y="340"/></Array></mxGeometry></mxCell>
<mxCell id="trans_6" value="System Error (Retry)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="process" target="init"><mxGeometry relative="1" as="geometry"><Array as="points"><Point x="680" y="500"/><Point x="680" y="190"/></Array></mxGeometry></mxCell>
<mxCell id="start_edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="start" target="init"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel>`
    }
}
