import { describe, it, expect } from 'vitest'
import { UiPathGenerator } from '../lib/uipath-utils'

describe('UiPathGenerator Advanced Mapping', () => {
    it('should generate LogMessage activity', () => {
        const xml = `<mxfile><diagram id="test"><mxGraphModel><root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="start" value="Start" style="ellipse" vertex="1" parent="1"><mxGeometry x="0" y="0" width="30" height="30" as="geometry"/></mxCell>
            <mxCell id="log" value="Log Start" style="rounded=0" vertex="1" parent="1"><mxGeometry x="0" y="50" width="100" height="50" as="geometry"/></mxCell>
            <mxCell id="edge" source="start" target="log" edge="1" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
        </root></mxGraphModel></diagram></mxfile>`

        const generator = new UiPathGenerator()
        const xaml = generator.generate(xml)

        expect(xaml).toContain('<ui:LogMessage')
        expect(xaml).toContain('Level="Info"')
        expect(xaml).toContain('Message="[&quot;Log Start&quot;]"')
    })

    it('should generate Assign activity', () => {
        const xml = `<mxfile><diagram id="test"><mxGraphModel><root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="start" value="Start" style="ellipse" vertex="1" parent="1"><mxGeometry x="0" y="0" width="30" height="30" as="geometry"/></mxCell>
            <mxCell id="assign" value="counter = 0" style="rounded=0" vertex="1" parent="1"><mxGeometry x="0" y="50" width="100" height="50" as="geometry"/></mxCell>
            <mxCell id="edge" source="start" target="assign" edge="1" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
        </root></mxGraphModel></diagram></mxfile>`

        const generator = new UiPathGenerator()
        const xaml = generator.generate(xml)

        expect(xaml).toContain('<Assign')
        expect(xaml).toContain('<OutArgument x:TypeArguments="x:String">[counter]</OutArgument>')
        expect(xaml).toContain('<InArgument x:TypeArguments="x:String">[0]</InArgument>')
    })

    it('should generate InvokeWorkflowFile activity', () => {
        const xml = `<mxfile><diagram id="test"><mxGraphModel><root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="start" value="Start" style="ellipse" vertex="1" parent="1"><mxGeometry x="0" y="0" width="30" height="30" as="geometry"/></mxCell>
            <mxCell id="invoke" value="Invoke ProcessData" style="rounded=0" vertex="1" parent="1"><mxGeometry x="0" y="50" width="100" height="50" as="geometry"/></mxCell>
            <mxCell id="edge" source="start" target="invoke" edge="1" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
        </root></mxGraphModel></diagram></mxfile>`

        const generator = new UiPathGenerator()
        const xaml = generator.generate(xml)

        expect(xaml).toContain('<ui:InvokeWorkflowFile')
        expect(xaml).toContain('WorkflowFileName="ProcessData.xaml"')
        expect(xaml).toContain('<ui:InvokeWorkflowFile.Arguments>')
    })

    it('should generate State.Entry in State Machine', () => {
         const xml = `<mxfile><diagram id="test"><mxGraphModel><root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="start" value="Start" style="ellipse" vertex="1" parent="1"><mxGeometry x="0" y="0" width="30" height="30" as="geometry"/></mxCell>
            <mxCell id="state" value="Log State" style="rounded=1" vertex="1" parent="1"><mxGeometry x="0" y="50" width="100" height="50" as="geometry"/></mxCell>
            <mxCell id="edge" source="start" target="state" edge="1" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
        </root></mxGraphModel></diagram></mxfile>`

        const generator = new UiPathGenerator()
        const xaml = generator.generate(xml)

        expect(xaml).toContain('<StateMachine.State>')
        expect(xaml).toContain('<State.Entry>')
        expect(xaml).toContain('<ui:LogMessage') // Should parse "Log State" as LogMessage inside Entry
    })
})
