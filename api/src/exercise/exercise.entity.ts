import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('exercises')
export class Exercise {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ default: '' })
  bodyPart: string;

  @Column({ nullable: true })
  equipment: string;

  @Column({ nullable: true })
  target: string;

  @Column('simple-json', { default: '[]' })
  secondaryMuscles: string[];

  @Column('simple-json', { default: '[]' })
  instructions: string[];

  @Column({ nullable: true })
  gifUrl: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  difficulty: string;

  @Column('float', { nullable: true })
  met: number;

  @Column('float', { nullable: true })
  caloriesPerMinute: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  nameKo: string;

  @Column({ nullable: true })
  userId: string;
}
