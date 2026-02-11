import { describe, it, expect } from 'vitest'
import { UiPathGenerator } from '../lib/uipath-utils'

describe('UiPathGenerator', () => {
    it('should generate ReFramework template XML', () => {
        const generator = new UiPathGenerator()
        const template = generator.getReFrameworkTemplate()
        expect(template).toContain('<mxGraphModel>')
        expect(template).toContain('id="init"')
        expect(template).toContain('id="end"')
    })

    it('should generate valid State Machine XAML from ReFramework template', () => {
        const generator = new UiPathGenerator()
        const template = generator.getReFrameworkTemplate()
        // Wrap with mxfile as expected by parser
        const fullXml = `<mxfile><diagram name="ReFramework" id="re-framework">${template}</diagram></mxfile>`
        
        const xaml = generator.generate(fullXml)
        
        // Basic XAML validation
        expect(xaml).toContain('<Activity')
        expect(xaml).toContain('x:Class="Main"')
        expect(xaml).toContain('<StateMachine')
        
        // Check for States
        expect(xaml).toContain('DisplayName="Initialization"')
        expect(xaml).toContain('DisplayName="Get Transaction Data"')
        expect(xaml).toContain('DisplayName="Process Transaction"')
        expect(xaml).toContain('DisplayName="End Process"')
        expect(xaml).toContain('IsFinal="True"')
        
        // Check for Transitions
        expect(xaml).toContain('<Transition DisplayName="Success"')
        expect(xaml).toContain('<Transition DisplayName="System Error"')
    })

    it('should generate Flowchart XAML from simple flowchart XML', () => {
        const simpleFlowchartXml = `<mxfile><diagram id="test"><mxGraphModel><root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="start" value="Start" style="ellipse" vertex="1" parent="1"><mxGeometry x="100" y="100" width="30" height="30" as="geometry"/></mxCell>
            <mxCell id="step1" value="Do Something" style="rounded=0" vertex="1" parent="1"><mxGeometry x="100" y="200" width="120" height="60" as="geometry"/></mxCell>
            <mxCell id="edge1" source="start" target="step1" edge="1" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
        </root></mxGraphModel></diagram></mxfile>`

        const generator = new UiPathGenerator()
        const xaml = generator.generate(simpleFlowchartXml)

        expect(xaml).toContain('<Flowchart')
        expect(xaml).toContain('<Flowchart.StartNode>')
        expect(xaml).toContain('DisplayName="Do Something"')
        expect(xaml).not.toContain('<StateMachine')
    })
})
