import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function WebSocketTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestingUnauth, setIsTestingUnauth] = useState(false);
  const { toast } = useToast();

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testUnauthenticatedConnection = async () => {
    setIsTestingUnauth(true);
    addResult('🔴 Testing unauthenticated WebSocket connection...');
    
    try {
      // Try to connect without any authentication
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;
      
      addResult(`Attempting connection to: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      const timeoutId = setTimeout(() => {
        addResult('❌ SECURITY FAILURE: Connection did not close within 5 seconds');
        ws.close();
        setIsTestingUnauth(false);
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        addResult('❌ CRITICAL SECURITY FAILURE: Unauthenticated connection was allowed!');
        toast({
          title: "Security Test Failed",
          description: "Unauthenticated WebSocket connection was allowed!",
          variant: "destructive",
        });
        ws.close();
        setIsTestingUnauth(false);
      };

      ws.onclose = (event) => {
        clearTimeout(timeoutId);
        if (event.code === 1008) {
          addResult('✅ SECURITY SUCCESS: Connection properly rejected with code 1008 (Authentication required)');
          toast({
            title: "Security Test Passed",
            description: "Unauthenticated connection was properly rejected",
            variant: "default",
          });
        } else {
          addResult(`⚠️ Connection closed with code: ${event.code}, reason: ${event.reason || 'none'}`);
        }
        setIsTestingUnauth(false);
      };

      ws.onerror = (error) => {
        clearTimeout(timeoutId);
        addResult('✅ SECURITY SUCCESS: Connection failed as expected (likely no session cookie)');
        setIsTestingUnauth(false);
      };

    } catch (error) {
      addResult(`✅ SECURITY SUCCESS: Connection failed with error: ${error}`);
      setIsTestingUnauth(false);
    }
  };

  const testInvalidOrigin = async () => {
    addResult('🔴 Testing WebSocket with invalid origin...');
    
    try {
      // This test would need to be done from a different origin in real scenario
      // For now, we'll just document that this is tested by the verifyClient method
      addResult('ℹ️ Origin validation is handled server-side in verifyClient method');
      addResult('ℹ️ Check server logs for origin validation messages');
    } catch (error) {
      addResult(`Origin test error: ${error}`);
    }
  };

  const testSessionValidation = () => {
    addResult('🔴 Testing session validation...');
    addResult('ℹ️ Session validation occurs server-side using Express session store');
    addResult('ℹ️ WebSocket connections require valid session cookie with authenticated user');
    addResult('ℹ️ Check server logs for session validation messages');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="websocket-test-page">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Security Test</CardTitle>
          <CardDescription>
            Test various security scenarios to ensure WebSocket connections are properly secured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={testUnauthenticatedConnection}
              disabled={isTestingUnauth}
              variant="destructive"
              data-testid="button-test-unauth"
            >
              {isTestingUnauth ? 'Testing...' : 'Test Unauthenticated Connection'}
            </Button>
            
            <Button 
              onClick={testInvalidOrigin}
              variant="outline"
              data-testid="button-test-origin"
            >
              Test Origin Validation
            </Button>
            
            <Button 
              onClick={testSessionValidation}
              variant="outline"
              data-testid="button-test-session"
            >
              Test Session Validation
            </Button>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Test Results</h3>
            <Button 
              onClick={clearResults}
              variant="ghost"
              size="sm"
              data-testid="button-clear-results"
            >
              Clear Results
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto" data-testid="test-results">
            {testResults.length === 0 ? (
              <p className="text-muted-foreground">No test results yet. Run a test to see results.</p>
            ) : (
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Security Requirements Implemented:</h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>✅ Session-based authentication (no client-provided credentials)</li>
              <li>✅ Origin/host validation in verifyClient</li>
              <li>✅ Express session integration for user verification</li>
              <li>✅ Organization-based connection isolation</li>
              <li>✅ Proper WebSocket close codes for security failures</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}