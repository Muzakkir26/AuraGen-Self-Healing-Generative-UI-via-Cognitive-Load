'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

interface SimpleContactFormProps {
  onSubmit?: (data: { name: string; email: string; message: string }) => void;
}

export function SimpleContactForm({ onSubmit }: SimpleContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-lg font-bold">Thank you!</h3>
        <p className="mt-2">Your message has been received.</p>
        <Button variant="outline" size="sm" onClick={() => setSubmitted(false)} className="mt-4">
          Send Another
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="text-sm font-bold">Contact Us</h3>
        </CardHeader>
        <CardBody className="grid gap-3">
          <Input
            label="Name"
            placeholder="Your name"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={e => handleChange('email', e.target.value)}
            required
          />
          <Input
            label="Message"
            as="textarea"
            rows={4}
            placeholder="Your message"
            value={formData.message}
            onChange={e => handleChange('message', e.target.value)}
            required
          />
        </CardBody>
        <CardFooter className="flex justify-end">
          <Button type="submit" variant="primary" size="sm">
            Submit
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
