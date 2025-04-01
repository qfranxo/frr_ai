import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { IFeatureSection } from '@/types';

interface Feature {
    id: number;
    title: string;
    description: string;
}

const FeatureSection = ({ features = [] }: IFeatureSection) => {
    return (
        <section>
         
            <div className="grid md:grid-cols-3 gap-8">
                {features.map((feature) => (
                    <Card key={feature.id}>
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                {/* 아이콘 또는 이미지 추가 */}
                            </div>
                            <h3 className="text-lg font-semibold">{feature.title}</h3>
                            <p className="text-gray-600">{feature.description}</p>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </section>
    );
};

export default FeatureSection; 